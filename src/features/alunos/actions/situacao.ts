"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  dataSchema,
  situacaoDaMatriculaSchema,
  type Aluno,
} from "@/core/modelo";
import {
  exigeDataPropria,
  normalizarSituacao,
} from "@/features/alunos/domain/situacao";

/**
 * Mudança de situação de matrícula **em lote**.
 *
 * No fim do ano a turma inteira conclui no mesmo dia, e marcar trinta
 * alunos um a um pela ficha é como três ficam para trás sem ninguém notar —
 * e aí a ata de concluídos sai incompleta, que é o documento que acompanha
 * a certificação.
 *
 * A ficha de cada aluno continua existindo para o caso avulso: o aluno que
 * se transfere em maio não espera o fim do ano.
 */

export interface ResultadoDaSituacao {
  ok: boolean;
  erro?: string;
  /** Quantos foram efetivamente alterados. */
  alterados?: number;
}

const loteSchema = z.object({
  matriculas: z.array(z.string().min(1)).min(1, "Selecione ao menos um aluno"),
  situacaoMatricula: situacaoDaMatriculaSchema,
  /** O dia do fato. Obrigatório quando a matrícula deixa de ser ativa. */
  dataDaSituacao: dataSchema.nullable().default(null),
});

export async function alterarSituacaoEmLote(
  dados: z.infer<typeof loteSchema>,
): Promise<ResultadoDaSituacao> {
  const entrada = loteSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const { matriculas, situacaoMatricula, dataDaSituacao } = entrada.data;

  /**
   * Sem data, a ata sai sem a coluna que o colégio pediu.
   *
   * É o erro que já existe na base: os 11 cancelados migrados não têm data,
   * porque o Access não a guardava. Deixar passar aqui repetiria o buraco
   * em cada turma que concluísse.
   */
  if (exigeDataPropria(situacaoMatricula) && !dataDaSituacao) {
    return {
      ok: false,
      erro: "Informe a data — é ela que aparece na ata como data de conclusão ou de transferência.",
    };
  }

  const db = getAdminDb();
  let alterados = 0;

  // Aluno por aluno, cada um com a própria trilha: mudar a situação de uma
  // matrícula é um ato sobre uma pessoa, e um lote anônimo não responderia
  // "quem encerrou a minha matrícula, e quando".
  for (const matricula of matriculas) {
    const referencia = db.collection(COLECOES.alunos).doc(matricula);
    const atual = await referencia.get();
    if (!atual.exists) continue;

    const anterior = atual.data() as Aluno;

    const alteracoes = await gravarComAuditoria({
      colecao: COLECOES.alunos,
      documentoId: matricula,
      antes: anterior,
      depois: { ...normalizarSituacao({
        situacaoMatricula,
        dataMatricula: anterior.dataMatricula ?? null,
        dataDaSituacao,
      }) },
      autor: sessao,
    });

    // `gravarComAuditoria` devolve vazio quando nada mudou — aluno que já
    // estava nessa situação não conta como alterado.
    if (Object.keys(alteracoes).length > 0) alterados += 1;

    revalidatePath(`/gestao/alunos/${matricula}`);
  }

  revalidatePath("/gestao/alunos");
  revalidatePath("/gestao/alunos/situacao");

  return { ok: true, alterados };
}
