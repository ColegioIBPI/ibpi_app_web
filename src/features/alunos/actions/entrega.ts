"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  entregaDeDocumentosSchema,
  tipoDeDocumentoEntregueSchema,
  type EntregaDeDocumentos,
} from "@/core/modelo";
import { marcar } from "@/features/alunos/domain/entrega";

/**
 * Conferência dos documentos entregues na matrícula.
 *
 * Quem marca é a secretaria e a coordenação — é quem recebe o papel no
 * balcão. Cada marcação passa pela auditoria: "eu entreguei sim" é uma
 * conversa que acontece, e a resposta precisa dizer quem conferiu e
 * quando.
 */

export interface ResultadoDaEntrega {
  ok: boolean;
  erro?: string;
}

const marcacaoSchema = z.object({
  matricula: z.string().min(1),
  tipo: tipoDeDocumentoEntregueSchema,
  entregue: z.boolean(),
});

export async function marcarEntrega(
  dados: z.infer<typeof marcacaoSchema>,
): Promise<ResultadoDaEntrega> {
  const entrada = marcacaoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const db = getAdminDb();

  const referencia = db
    .collection(COLECOES.entregaDeDocumentos)
    .doc(entrada.data.matricula);
  const atual = await referencia.get();
  const anterior = atual.exists
    ? (atual.data() as EntregaDeDocumentos)
    : null;

  const documento = entregaDeDocumentosSchema.safeParse({
    matricula: entrada.data.matricula,
    itens: {
      ...(anterior?.itens ?? {}),
      [entrada.data.tipo]: marcar(entrada.data.entregue, sessao.nome),
    },
    observacoes: anterior?.observacoes ?? null,
    origem: anterior?.origem ?? "portal",
  });

  if (!documento.success) {
    return { ok: false, erro: documento.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.entregaDeDocumentos,
    documentoId: entrada.data.matricula,
    antes: anterior,
    depois: documento.data,
    autor: sessao,
  });

  revalidatePath(`/gestao/alunos/${entrada.data.matricula}`);

  return { ok: true };
}

const observacoesSchema = z.object({
  matricula: z.string().min(1),
  observacoes: z.string().trim().nullable().default(null),
});

export async function salvarObservacoesDaEntrega(
  dados: z.infer<typeof observacoesSchema>,
): Promise<ResultadoDaEntrega> {
  const entrada = observacoesSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const db = getAdminDb();

  const referencia = db
    .collection(COLECOES.entregaDeDocumentos)
    .doc(entrada.data.matricula);
  const atual = await referencia.get();
  const anterior = atual.exists
    ? (atual.data() as EntregaDeDocumentos)
    : null;

  const documento = entregaDeDocumentosSchema.safeParse({
    matricula: entrada.data.matricula,
    itens: anterior?.itens ?? {},
    observacoes: entrada.data.observacoes,
    origem: anterior?.origem ?? "portal",
  });

  if (!documento.success) {
    return { ok: false, erro: documento.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.entregaDeDocumentos,
    documentoId: entrada.data.matricula,
    antes: anterior,
    depois: documento.data,
    autor: sessao,
  });

  revalidatePath(`/gestao/alunos/${entrada.data.matricula}`);

  return { ok: true };
}
