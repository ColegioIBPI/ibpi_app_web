"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { escopoDeAlunos } from "@/core/auth/roles";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Ocorrencia } from "@/core/modelo";

/**
 * Publicação de uma ocorrência já registrada.
 *
 * Existe porque a decisão de publicar nem sempre é a mesma do dia do
 * registro: a coordenação conversa com a família depois, e o que parecia
 * delicado deixa de ser — ou o contrário. Até aqui, mudar isso exigia
 * reabrir a chamada do dia.
 */

export interface ResultadoDaPublicacao {
  ok: boolean;
  erro?: string;
}

const publicacaoSchema = z.object({
  id: z.string().min(1),
  visivelParaResponsavel: z.boolean(),
  visivelParaAluno: z.boolean(),
});

export async function alterarPublicacao(
  dados: z.infer<typeof publicacaoSchema>,
): Promise<ResultadoDaPublicacao> {
  const entrada = publicacaoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("ocorrencias", "lancar");
  const db = getAdminDb();

  const referencia = db.collection(COLECOES.ocorrencias).doc(entrada.data.id);
  const atual = await referencia.get();

  if (!atual.exists) {
    return { ok: false, erro: "Ocorrência não encontrada." };
  }

  const ocorrencia = atual.data() as Ocorrencia;

  /**
   * O professor só mexe nas turmas que leciona.
   *
   * Ele tem `ocorrencias: lancar` — é ele quem registra na chamada —, mas
   * a permissão vale dentro do escopo dele. Sem esta conferência, um
   * professor poderia publicar ou reter a ocorrência de uma turma que não
   * é dele, e nada na tela o impediria porque a lista dele nem a mostra.
   */
  if (escopoDeAlunos(sessao.role) === "turmas-lecionadas") {
    const perfil = await db.collection(COLECOES.users).doc(sessao.uid).get();
    const turmas = (perfil.data()?.turmas as string[]) ?? [];

    if (!turmas.includes(ocorrencia.turmaId)) {
      return { ok: false, erro: "Esta ocorrência não é de uma turma sua." };
    }
  }

  await gravarComAuditoria({
    colecao: COLECOES.ocorrencias,
    documentoId: entrada.data.id,
    antes: ocorrencia,
    depois: {
      visivelParaResponsavel: entrada.data.visivelParaResponsavel,
      visivelParaAluno: entrada.data.visivelParaAluno,
    },
    autor: sessao,
  });

  revalidatePath("/gestao/ocorrencias");
  revalidatePath("/portal/ocorrencias");

  return { ok: true };
}
