"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  entregaDeDocumentosSchema,
  tipoDeDocumentoEntregueSchema,
  type EntregaDeDocumentos,
} from "@/core/modelo";
import { extrairPastaDoDrive } from "@/features/alunos/domain/drive";
import { baseDaEntrega, marcar } from "@/features/alunos/domain/entrega";

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

/**
 * Lê o documento atual e grava a versão com a mudança aplicada.
 *
 * As três ações passam por aqui porque a gravação é `merge` sobre um
 * documento **inteiro validado**: o schema preenche o que falta com o
 * padrão, então montar só o pedaço alterado apagaria os outros campos —
 * salvar uma observação zeraria a pasta do Drive sem ninguém perceber.
 */
async function alterarEntrega(
  matricula: string,
  sessao: SessionUser,
  mudanca: (anterior: EntregaDeDocumentos | null) => Partial<EntregaDeDocumentos>,
): Promise<ResultadoDaEntrega> {
  const db = getAdminDb();
  const referencia = db.collection(COLECOES.entregaDeDocumentos).doc(matricula);
  const atual = await referencia.get();
  const anterior = atual.exists ? (atual.data() as EntregaDeDocumentos) : null;

  const documento = entregaDeDocumentosSchema.safeParse({
    ...baseDaEntrega(matricula, anterior),
    ...mudanca(anterior),
  });

  if (!documento.success) {
    return { ok: false, erro: documento.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.entregaDeDocumentos,
    documentoId: matricula,
    antes: anterior,
    depois: documento.data,
    autor: sessao,
  });

  revalidatePath(`/gestao/alunos/${matricula}`);

  return { ok: true };
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

  return alterarEntrega(entrada.data.matricula, sessao, (anterior) => ({
    itens: {
      ...(anterior?.itens ?? {}),
      [entrada.data.tipo]: marcar(entrada.data.entregue, sessao.nome),
    },
  }));
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

  return alterarEntrega(entrada.data.matricula, sessao, () => ({
    observacoes: entrada.data.observacoes,
  }));
}

const pastaSchema = z.object({
  matricula: z.string().min(1),
  /** O link colado do Drive, ou vazio para desvincular. */
  link: z.string().trim().default(""),
});

export async function salvarPastaDoDrive(
  dados: z.infer<typeof pastaSchema>,
): Promise<ResultadoDaEntrega> {
  const entrada = pastaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("cadastros", "gerenciar");

  // Desvincular é deliberado: campo vazio tira a pasta.
  if (!entrada.data.link) {
    return alterarEntrega(entrada.data.matricula, sessao, () => ({
      pastaDoDrive: null,
    }));
  }

  const pastaDoDrive = extrairPastaDoDrive(entrada.data.link);

  // Recusar é melhor que guardar o que não abre: um link quebrado só
  // aparece no dia em que alguém precisa do documento.
  if (!pastaDoDrive) {
    return {
      ok: false,
      erro: "Não reconheci uma pasta nesse link. Abra a pasta do aluno no Drive e copie o endereço da barra.",
    };
  }

  return alterarEntrega(entrada.data.matricula, sessao, () => ({
    pastaDoDrive,
  }));
}
