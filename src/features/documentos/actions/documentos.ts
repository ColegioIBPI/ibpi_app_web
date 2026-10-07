"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  documentoSolicitavelSchema,
  type DocumentoSolicitavel,
} from "@/core/modelo";

/**
 * Manutenção do catálogo de documentos.
 *
 * Quem mantém é a secretaria e a coordenação — é cadastro estrutural, como
 * turma e disciplina, e por isso usa o recurso `cadastros` em vez de criar
 * um recurso só para ele.
 */

export interface ResultadoDoDocumento {
  ok: boolean;
  erro?: string;
  id?: string;
}

const formularioSchema = z.object({
  id: z.string().optional(),
  nome: z.string().trim().min(2, "Informe o nome do documento."),
  descricao: z.string().trim().nullable().default(null),
  prazoEmDiasUteis: z.number().int().min(0).nullable().default(null),
  valor: z.number().min(0).nullable().default(null),
  exigeComprovante: z.boolean().default(false),
  ordem: z.number().int().default(0),
});

export type FormularioDeDocumento = z.infer<typeof formularioSchema>;

export async function salvarDocumento(
  dados: FormularioDeDocumento,
): Promise<ResultadoDoDocumento> {
  const entrada = formularioSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const db = getAdminDb();

  const referencia = entrada.data.id
    ? db.collection(COLECOES.documentosSolicitaveis).doc(entrada.data.id)
    : db.collection(COLECOES.documentosSolicitaveis).doc();

  const atual = await referencia.get();
  const anterior = atual.exists ? (atual.data() as DocumentoSolicitavel) : null;

  const documento = documentoSolicitavelSchema.safeParse({
    ...entrada.data,
    // Editar não republica: o que estava fora do ar continua fora.
    ativo: anterior?.ativo ?? true,
    origem: anterior?.origem ?? "portal",
  });

  if (!documento.success) {
    return { ok: false, erro: documento.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.documentosSolicitaveis,
    documentoId: referencia.id,
    antes: anterior,
    depois: documento.data,
    autor: sessao,
  });

  revalidar(referencia.id);

  return { ok: true, id: referencia.id };
}

/** Tira o item da lista da família sem apagá-lo. */
export async function alterarDisponibilidade(
  id: string,
  ativo: boolean,
): Promise<ResultadoDoDocumento> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const referencia = getAdminDb()
    .collection(COLECOES.documentosSolicitaveis)
    .doc(id);
  const atual = await referencia.get();

  if (!atual.exists) return { ok: false, erro: "Documento não encontrado." };

  await gravarComAuditoria({
    colecao: COLECOES.documentosSolicitaveis,
    documentoId: id,
    antes: atual.data() as DocumentoSolicitavel,
    depois: { ativo },
    autor: sessao,
  });

  revalidar(id);

  return { ok: true, id };
}

/**
 * Apaga o item do catálogo.
 *
 * Só enquanto **nenhuma família pediu**. Depois do primeiro pedido, apagar
 * deixaria o pedido apontando para um documento que não existe mais — e o
 * histórico de "o que esta família pediu em março" é justamente o que a
 * secretaria precisa quando alguém reclama. Nesse caso o caminho é tirar de
 * disponibilidade, que some da lista e preserva o registro.
 */
export async function removerDocumento(
  id: string,
): Promise<ResultadoDoDocumento> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const db = getAdminDb();

  const referencia = db.collection(COLECOES.documentosSolicitaveis).doc(id);
  const atual = await referencia.get();

  if (!atual.exists) return { ok: false, erro: "Documento não encontrado." };

  const pedidos = await db
    .collection(COLECOES.solicitacoes)
    .where("documentoId", "==", id)
    .limit(1)
    .get();

  if (!pedidos.empty) {
    return {
      ok: false,
      erro:
        "Este documento já foi solicitado por alguma família e não pode ser " +
        "apagado. Tire-o de disponibilidade para sumir da lista.",
    };
  }

  const lote = db.batch();

  lote.delete(referencia);
  lote.set(db.collection(COLECOES.auditoria).doc(), {
    colecao: COLECOES.documentosSolicitaveis,
    documentoId: id,
    acao: "removeu",
    alteracoes: {},
    autorUid: sessao.uid,
    autorNome: sessao.nome,
    autorPerfil: sessao.role,
    em: new Date().toISOString(),
  });

  await lote.commit();

  revalidar(id);

  return { ok: true, id };
}

function revalidar(id: string) {
  revalidatePath("/gestao/documentos");
  revalidatePath(`/gestao/documentos/${id}`);
}
