"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { administraEscola } from "@/core/auth/roles";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  situacaoDaSolicitacaoSchema,
  solicitacaoDeDocumentacaoSchema,
  type Aluno,
  type DocumentoSolicitavel,
  type PassoDaSolicitacao,
  type Solicitacao,
} from "@/core/modelo";
import { exigeMotivo, podeMover } from "@/features/solicitacoes/domain/fila";

/**
 * Escrita dos pedidos.
 *
 * **É o único lugar em que a família grava algo no sistema.** Por isso o
 * vínculo com o aluno é conferido aqui, no servidor, antes de qualquer
 * gravação — a regra do Firestore continua negando toda escrita pelo
 * cliente, e é esta função que decide se o pedido é legítimo.
 */

export interface ResultadoDaSolicitacao {
  ok: boolean;
  erro?: string;
  id?: string;
}

const pedidoDeDocumentacaoSchema = z.object({
  matricula: z.string().min(1, "Escolha o aluno."),
  documentoId: z.string().min(1, "Escolha o documento."),
  observacoes: z.string().trim().nullable().default(null),
});

export type PedidoDeDocumentacao = z.infer<typeof pedidoDeDocumentacaoSchema>;

export async function abrirPedidoDeDocumentacao(
  dados: PedidoDeDocumentacao,
): Promise<ResultadoDaSolicitacao> {
  const entrada = pedidoDeDocumentacaoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("solicitacoes", "lancar");
  const db = getAdminDb();

  // O vínculo vem da sessão, não do formulário: sem isto, bastaria trocar a
  // matrícula no corpo da requisição para pedir o histórico de outro aluno.
  if (!sessao.alunosVinculados.includes(entrada.data.matricula)) {
    return { ok: false, erro: "Aluno não encontrado." };
  }

  const [alunoDoc, documentoDoc] = await Promise.all([
    db.collection(COLECOES.alunos).doc(entrada.data.matricula).get(),
    db
      .collection(COLECOES.documentosSolicitaveis)
      .doc(entrada.data.documentoId)
      .get(),
  ]);

  if (!alunoDoc.exists) return { ok: false, erro: "Aluno não encontrado." };

  const documento = documentoDoc.exists
    ? (documentoDoc.data() as DocumentoSolicitavel)
    : null;

  // Fora da lista não se pede: o catálogo da tela pode estar velho na aba
  // que ficou aberta desde ontem.
  if (!documento || !documento.ativo) {
    return {
      ok: false,
      erro: "Este documento não está disponível para solicitação.",
    };
  }

  const aluno = alunoDoc.data() as Aluno;
  const agora = new Date().toISOString();

  const solicitacao = solicitacaoDeDocumentacaoSchema.safeParse({
    tipo: "documentacao",
    matricula: entrada.data.matricula,
    alunoNome: aluno.nome,
    turmaCodigo: aluno.turmaCodigo ?? null,
    solicitanteUid: sessao.uid,
    solicitanteNome: sessao.nome,
    documentoId: entrada.data.documentoId,
    // Cópia proposital: renomear o item do catálogo não pode reescrever o
    // que a família pediu no mês passado.
    documentoNome: documento.nome,
    observacoes: entrada.data.observacoes,
    situacao: "aberta",
    historico: [
      {
        situacao: "aberta",
        em: agora,
        porUid: sessao.uid,
        porNome: sessao.nome,
      },
    ],
    abertaEm: agora,
    origem: "portal",
  });

  if (!solicitacao.success) {
    return { ok: false, erro: solicitacao.error.issues[0]?.message };
  }

  const referencia = db.collection(COLECOES.solicitacoes).doc();

  await gravarComAuditoria({
    colecao: COLECOES.solicitacoes,
    documentoId: referencia.id,
    antes: null,
    depois: solicitacao.data,
    autor: sessao,
  });

  revalidar(referencia.id);

  return { ok: true, id: referencia.id };
}

const mudancaSchema = z.object({
  id: z.string().min(1),
  situacao: situacaoDaSolicitacaoSchema,
  motivo: z.string().trim().nullable().default(null),
});

/**
 * Move o pedido na fila.
 *
 * Serve à escola e à família com a mesma função, porque a pergunta "esta
 * pessoa pode levar este pedido daqui para ali" é uma só — e duplicá-la em
 * duas ações é como as duas telas passam a discordar.
 */
export async function mudarSituacao(
  dados: z.infer<typeof mudancaSchema>,
): Promise<ResultadoDaSolicitacao> {
  const entrada = mudancaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("solicitacoes", "lancar");
  const db = getAdminDb();

  const referencia = db.collection(COLECOES.solicitacoes).doc(entrada.data.id);
  const atual = await referencia.get();

  if (!atual.exists) return { ok: false, erro: "Pedido não encontrado." };

  const solicitacao = atual.data() as Solicitacao;
  const daEscola = administraEscola(sessao.role);

  // Mesma resposta para pedido inexistente e para pedido de outra família.
  if (!daEscola && !sessao.alunosVinculados.includes(solicitacao.matricula)) {
    return { ok: false, erro: "Pedido não encontrado." };
  }

  const quem = daEscola ? "escola" : "familia";

  if (!podeMover(solicitacao.situacao, entrada.data.situacao, quem)) {
    return {
      ok: false,
      erro: `Um pedido ${solicitacao.situacao} não pode passar para ${entrada.data.situacao}.`,
    };
  }

  if (exigeMotivo(entrada.data.situacao) && !entrada.data.motivo) {
    return {
      ok: false,
      erro: "Escreva o motivo da recusa — a família vai ler.",
    };
  }

  const passo: PassoDaSolicitacao = {
    situacao: entrada.data.situacao,
    em: new Date().toISOString(),
    porUid: sessao.uid,
    porNome: sessao.nome,
    motivo: entrada.data.motivo,
  };

  await gravarComAuditoria({
    colecao: COLECOES.solicitacoes,
    documentoId: entrada.data.id,
    antes: solicitacao,
    depois: {
      situacao: entrada.data.situacao,
      historico: [...(solicitacao.historico ?? []), passo],
    },
    autor: sessao,
  });

  revalidar(entrada.data.id);

  return { ok: true, id: entrada.data.id };
}

function revalidar(id: string) {
  revalidatePath("/gestao/solicitacoes");
  revalidatePath(`/gestao/solicitacoes/${id}`);
  revalidatePath("/portal/solicitacoes");
}
