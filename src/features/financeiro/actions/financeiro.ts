"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  cobrancaSchema,
  COLECOES,
  dataSchema,
  tipoDeContratoSchema,
  type Cobranca,
} from "@/core/modelo";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";
import { gerarParcelas } from "@/features/financeiro/domain/plano";
import { idDaParcela } from "@/features/financeiro/services/financeiro.server";

/**
 * Escrita do financeiro.
 *
 * Nenhum dinheiro passa pelo sistema: isto registra o que já aconteceu no
 * banco ou no caixa do colégio. Toda gravação passa por
 * `gravarComAuditoria` — financeiro é um dos três dados que o colégio
 * precisa saber quem mudou e quando (README, seção 6.3).
 *
 * Quem escreve é o perfil financeiro (e secretaria/coordenação não: elas
 * têm apenas leitura no recurso, ver a matriz em `core/auth/roles.ts`).
 */

export interface ResultadoFinanceiro {
  ok: boolean;
  erro?: string;
  /** Quantas parcelas foram criadas ou alteradas. */
  parcelas?: number;
}

const planoSchema = z.object({
  matricula: z.string().min(1),
  valor: z.number().positive("Informe o valor total do plano."),
  parcelas: z.number().int().positive(),
  primeiroVencimento: dataSchema,
  tipo: tipoDeContratoSchema.default("outros"),
  observacoes: z.string().trim().nullable().default(null),
});

export type EntradaDoPlano = z.infer<typeof planoSchema>;

/**
 * Cria o carnê de um plano de pagamento.
 *
 * Recusa quando alguma parcela gerada já existe: refazer o plano por cima
 * de um carnê já aberto apagaria baixas que a secretaria lançou.
 */
export async function criarPlanoDePagamento(
  dados: EntradaDoPlano,
): Promise<ResultadoFinanceiro> {
  const entrada = planoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("financeiro", "lancar");

  const aluno = await obterAlunoVisivel(sessao, entrada.data.matricula);
  if (!aluno) return { ok: false, erro: "Aluno não encontrado." };

  const { parcelas, erro } = gerarParcelas(entrada.data);
  if (erro) return { ok: false, erro };

  const db = getAdminDb();
  const referencias = parcelas.map((parcela) =>
    db
      .collection(COLECOES.cobrancas)
      .doc(
        idDaParcela(
          entrada.data.matricula,
          parcela.vencimento,
          parcela.parcela,
          parcela.totalDeParcelas,
        ),
      ),
  );

  const existentes = await db.getAll(...referencias);
  const jaAbertas = existentes.filter((doc) => doc.exists);

  if (jaAbertas.length > 0) {
    return {
      ok: false,
      erro: `Já existe um carnê com essas parcelas (${jaAbertas.length} de ${parcelas.length}). Apague as parcelas antigas antes de gerar outro.`,
    };
  }

  for (const [indice, parcela] of parcelas.entries()) {
    const cobranca = cobrancaSchema.safeParse({
      matricula: entrada.data.matricula,
      vencimento: parcela.vencimento,
      parcela: parcela.parcela,
      totalDeParcelas: parcela.totalDeParcelas,
      valor: parcela.valor,
      valorPago: null,
      dataPagamento: null,
      observacoes: entrada.data.observacoes,
      origem: "portal",
    });

    if (!cobranca.success) {
      return { ok: false, erro: cobranca.error.issues[0]?.message };
    }

    await gravarComAuditoria({
      colecao: COLECOES.cobrancas,
      documentoId: referencias[indice].id,
      antes: null,
      depois: cobranca.data,
      autor: sessao,
    });
  }

  revalidar(entrada.data.matricula);

  return { ok: true, parcelas: parcelas.length };
}

const baixaSchema = z.object({
  id: z.string().min(1),
  dataPagamento: dataSchema,
  valorPago: z.number().min(0, "O valor pago não pode ser negativo."),
  banco: z.string().trim().nullable().default(null),
  recibo: z.string().trim().nullable().default(null),
  observacoes: z.string().trim().nullable().default(null),
});

/** Baixa manual: registra o pagamento que já aconteceu. */
export async function darBaixa(
  dados: z.infer<typeof baixaSchema>,
): Promise<ResultadoFinanceiro> {
  const entrada = baixaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("financeiro", "lancar");
  const contexto = await abrir(sessao, entrada.data.id);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  await gravarComAuditoria({
    colecao: COLECOES.cobrancas,
    documentoId: entrada.data.id,
    antes: contexto.cobranca,
    depois: {
      dataPagamento: entrada.data.dataPagamento,
      valorPago: entrada.data.valorPago,
      banco: entrada.data.banco,
      recibo: entrada.data.recibo,
      observacoes: entrada.data.observacoes,
      baixadoPor: sessao.uid,
    },
    autor: sessao,
  });

  revalidar(contexto.cobranca.matricula);

  return { ok: true, parcelas: 1 };
}

/**
 * Desfaz a baixa.
 *
 * Existe porque baixa lançada na parcela errada acontece, e sem isto a
 * correção seria apagar a parcela e recriá-la — o que levaria junto o
 * histórico dela.
 */
export async function desfazerBaixa(
  id: string,
): Promise<ResultadoFinanceiro> {
  const sessao = await exigirPermissao("financeiro", "lancar");
  const contexto = await abrir(sessao, id);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  if (!contexto.cobranca.dataPagamento) {
    return { ok: false, erro: "Esta parcela não tem baixa para desfazer." };
  }

  await gravarComAuditoria({
    colecao: COLECOES.cobrancas,
    documentoId: id,
    antes: contexto.cobranca,
    depois: {
      dataPagamento: null,
      valorPago: null,
      banco: null,
      recibo: null,
      baixadoPor: sessao.uid,
    },
    autor: sessao,
  });

  revalidar(contexto.cobranca.matricula);

  return { ok: true, parcelas: 1 };
}

const edicaoSchema = z.object({
  id: z.string().min(1),
  vencimento: dataSchema,
  valor: z.number().min(0, "O valor não pode ser negativo."),
  observacoes: z.string().trim().nullable().default(null),
});

export async function editarCobranca(
  dados: z.infer<typeof edicaoSchema>,
): Promise<ResultadoFinanceiro> {
  const entrada = edicaoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("financeiro", "lancar");
  const contexto = await abrir(sessao, entrada.data.id);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  await gravarComAuditoria({
    colecao: COLECOES.cobrancas,
    documentoId: entrada.data.id,
    antes: contexto.cobranca,
    depois: {
      vencimento: entrada.data.vencimento,
      valor: entrada.data.valor,
      observacoes: entrada.data.observacoes,
    },
    autor: sessao,
  });

  revalidar(contexto.cobranca.matricula);

  return { ok: true, parcelas: 1 };
}

/**
 * Apaga uma parcela.
 *
 * Só o que ainda não foi pago: apagar uma parcela quitada sumiria com o
 * registro de um pagamento que a família fez, e é exatamente esse registro
 * que o colégio precisa quando a família contesta.
 */
export async function removerCobranca(
  id: string,
): Promise<ResultadoFinanceiro> {
  const sessao = await exigirPermissao("financeiro", "lancar");
  const contexto = await abrir(sessao, id);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  if (contexto.cobranca.dataPagamento) {
    return {
      ok: false,
      erro: "Parcela paga não pode ser apagada. Desfaça a baixa primeiro.",
    };
  }

  const db = getAdminDb();
  const lote = db.batch();
  const agora = new Date().toISOString();

  lote.delete(db.collection(COLECOES.cobrancas).doc(id));
  lote.set(db.collection(COLECOES.auditoria).doc(), {
    colecao: COLECOES.cobrancas,
    documentoId: id,
    acao: "removeu",
    alteracoes: {},
    autorUid: sessao.uid,
    autorNome: sessao.nome,
    autorPerfil: sessao.role,
    em: agora,
  });

  await lote.commit();

  revalidar(contexto.cobranca.matricula);

  return { ok: true, parcelas: 1 };
}

/** Carrega a cobrança e verifica o escopo do aluno dela. */
async function abrir(
  sessao: Awaited<ReturnType<typeof exigirPermissao>>,
  id: string,
) {
  const doc = await getAdminDb().collection(COLECOES.cobrancas).doc(id).get();

  if (!doc.exists) return { erro: "Parcela não encontrada." as const };

  const cobranca = doc.data() as Cobranca;

  // Mesma resposta para parcela inexistente e para aluno fora do escopo.
  const aluno = await obterAlunoVisivel(sessao, cobranca.matricula);
  if (!aluno) return { erro: "Parcela não encontrada." as const };

  return { cobranca };
}

function revalidar(matricula: string) {
  revalidatePath("/gestao/financeiro");
  revalidatePath(`/gestao/financeiro/${matricula}`);
  revalidatePath("/portal/financeiro");
}
