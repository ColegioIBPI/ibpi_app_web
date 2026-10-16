"use server";

import { revalidatePath } from "next/cache";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb, getAdminStorage } from "@/core/firebase/admin";
import { boletoSchema, COLECOES, type Boleto } from "@/core/modelo";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";
import { validarBoleto } from "@/features/financeiro/domain/boleto";

/**
 * Envio do boleto do aluno.
 *
 * **Um por aluno**: o documento tem a matrícula como id, então enviar
 * outro substitui. É o boleto atual que a família precisa, e uma lista de
 * antigos só criaria a dúvida de qual pagar.
 *
 * O arquivo novo é gravado **antes** de o antigo sair. Apagar primeiro
 * deixaria a família sem boleto nenhum se o envio falhasse no meio — e
 * falha de upload em rede de escola não é hipótese remota.
 */

export interface ResultadoDoBoleto {
  ok: boolean;
  erro?: string;
}

export async function salvarBoleto(
  formulario: FormData,
): Promise<ResultadoDoBoleto> {
  const sessao = await exigirPermissao("financeiro", "lancar");

  const matricula = String(formulario.get("matricula") ?? "");
  const arquivo = formulario.get("arquivo");
  const observacoes = String(formulario.get("observacoes") ?? "").trim();

  if (!matricula) return { ok: false, erro: "Aluno não informado." };

  if (!(arquivo instanceof File)) {
    return { ok: false, erro: "Escolha o arquivo do boleto." };
  }

  const validacao = validarBoleto({
    type: arquivo.type,
    size: arquivo.size,
    name: arquivo.name,
  });
  if (!validacao.ok) return { ok: false, erro: validacao.erro };

  // Mesma resposta para aluno inexistente e para aluno fora do escopo.
  const aluno = await obterAlunoVisivel(sessao, matricula);
  if (!aluno) return { ok: false, erro: "Aluno não encontrado." };

  const db = getAdminDb();
  const referencia = db.collection(COLECOES.boletos).doc(matricula);
  const atual = await referencia.get();
  const anterior = atual.exists ? (atual.data() as Boleto) : null;

  const nome = arquivo.name || "boleto.pdf";
  const path = `boletos/${matricula}/${Date.now()}-${nome}`;

  await getAdminStorage()
    .bucket()
    .file(path)
    .save(Buffer.from(await arquivo.arrayBuffer()), {
      contentType: arquivo.type,
    });

  const boleto = boletoSchema.safeParse({
    matricula,
    arquivo: { path, nome, tipo: arquivo.type, tamanho: arquivo.size },
    observacoes: observacoes || null,
    atualizadoPorNome: sessao.nome,
    origem: "portal",
  });

  if (!boleto.success) {
    await apagarArquivo(path);
    return { ok: false, erro: boleto.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.boletos,
    documentoId: matricula,
    antes: anterior,
    depois: boleto.data,
    autor: sessao,
  });

  // Só agora: o novo já está no lugar.
  if (anterior?.arquivo?.path && anterior.arquivo.path !== path) {
    await apagarArquivo(anterior.arquivo.path);
  }

  revalidar(matricula);

  return { ok: true };
}

/**
 * Tira o boleto do ar.
 *
 * Aqui apagar é o certo, e não despublicar: boleto vencido ou emitido por
 * engano na mão da família gera pagamento errado, e o registro do que
 * aconteceu fica na auditoria.
 */
export async function removerBoleto(
  matricula: string,
): Promise<ResultadoDoBoleto> {
  const sessao = await exigirPermissao("financeiro", "lancar");

  const aluno = await obterAlunoVisivel(sessao, matricula);
  if (!aluno) return { ok: false, erro: "Aluno não encontrado." };

  const db = getAdminDb();
  const referencia = db.collection(COLECOES.boletos).doc(matricula);
  const atual = await referencia.get();

  if (!atual.exists) return { ok: false, erro: "Não há boleto enviado." };

  const anterior = atual.data() as Boleto;

  const lote = db.batch();
  lote.delete(referencia);
  lote.set(db.collection(COLECOES.auditoria).doc(), {
    colecao: COLECOES.boletos,
    documentoId: matricula,
    acao: "removeu",
    alteracoes: {
      arquivo: { de: anterior.arquivo?.nome ?? null, para: null },
    },
    autorUid: sessao.uid,
    autorNome: sessao.nome,
    autorPerfil: sessao.role,
    em: new Date().toISOString(),
  });

  await lote.commit();

  if (anterior.arquivo?.path) await apagarArquivo(anterior.arquivo.path);

  revalidar(matricula);

  return { ok: true };
}

async function apagarArquivo(path: string) {
  await getAdminStorage()
    .bucket()
    .file(path)
    .delete()
    .catch(() => {
      // Arquivo órfão é problema de limpeza, não de correção: não pode
      // derrubar uma gravação que já deu certo.
    });
}

function revalidar(matricula: string) {
  revalidatePath(`/gestao/financeiro/${matricula}`);
  revalidatePath("/portal/financeiro");
}
