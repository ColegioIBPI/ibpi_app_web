"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, credenciaisSchema, type Credenciais } from "@/core/modelo";

/**
 * Cadastro dos acessos do aluno às plataformas.
 *
 * Quem preenche é a secretaria — é ela que cria essas contas. A família só
 * lê.
 *
 * A auditoria registra **quem alterou**, como em toda escrita do sistema.
 * Ela não registra quem leu: para isso seria preciso uma rota própria, e a
 * leitura aqui é direta do Firestore.
 */

export interface ResultadoDasCredenciais {
  ok: boolean;
  erro?: string;
}

const formularioSchema = z.object({
  matricula: z.string().min(1),
  ibpiOnlineUsuario: z.string().trim().nullable().default(null),
  ibpiOnlineSenha: z.string().trim().nullable().default(null),
  pluralUsuario: z.string().trim().nullable().default(null),
  pluralSenha: z.string().trim().nullable().default(null),
  observacoes: z.string().trim().nullable().default(null),
});

export type FormularioDeCredenciais = z.infer<typeof formularioSchema>;

export async function salvarCredenciais(
  dados: FormularioDeCredenciais,
): Promise<ResultadoDasCredenciais> {
  const entrada = formularioSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const db = getAdminDb();

  const referencia = db
    .collection(COLECOES.credenciais)
    .doc(entrada.data.matricula);
  const atual = await referencia.get();

  const credenciais = credenciaisSchema.safeParse({
    matricula: entrada.data.matricula,
    ibpiOnline: {
      usuario: entrada.data.ibpiOnlineUsuario,
      senha: entrada.data.ibpiOnlineSenha,
    },
    plural: {
      usuario: entrada.data.pluralUsuario,
      senha: entrada.data.pluralSenha,
    },
    observacoes: entrada.data.observacoes,
    atualizadoPorNome: sessao.nome,
    origem: "portal",
  });

  if (!credenciais.success) {
    return { ok: false, erro: credenciais.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.credenciais,
    documentoId: referencia.id,
    antes: atual.exists ? (atual.data() as Credenciais) : null,
    depois: credenciais.data,
    autor: sessao,
  });

  revalidatePath(`/gestao/alunos/${entrada.data.matricula}`);
  revalidatePath("/portal");

  return { ok: true };
}
