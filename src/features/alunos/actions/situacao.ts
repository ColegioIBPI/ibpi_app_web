"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { anoLetivoEscolhido } from "@/core/escola/ano-letivo.server";
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
import { propagarSituacaoParaOAno } from "@/features/alunos/services/matricula-do-ano.server";

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

  /**
   * A situação é **do ano em que a secretaria está**.
   *
   * O aluno que concluiu em 2026 está concluído desde dezembro; se a ata
   * de 2026 perguntasse ao cadastro, ela sairia com todo mundo concluído,
   * inclusive quem ainda cursava em março. E quem cancelar em 2027
   * apareceria como cancelado na ata de 2026, um ano que ele estudou
   * inteiro.
   *
   * Por isso a mudança vai também para o registro **daquele ano**, e só
   * para ele: encerrar a matrícula de 2026 não é encerrar a de 2027.
   */
  const anoLetivo = await anoLetivoEscolhido();

  let alterados = 0;

  // Aluno por aluno, cada um com a própria trilha: mudar a situação de uma
  // matrícula é um ato sobre uma pessoa, e um lote anônimo não responderia
  // "quem encerrou a minha matrícula, e quando".
  for (const matricula of matriculas) {
    const referencia = db.collection(COLECOES.alunos).doc(matricula);
    const atual = await referencia.get();
    if (!atual.exists) continue;

    const anterior = atual.data() as Aluno;

    const normalizada = normalizarSituacao({
      situacaoMatricula,
      dataMatricula: anterior.dataMatricula ?? null,
      dataDaSituacao,
    });

    const alteracoes = await gravarComAuditoria({
      colecao: COLECOES.alunos,
      documentoId: matricula,
      antes: anterior,
      depois: { ...normalizada },
      autor: sessao,
    });

    await propagarSituacaoParaOAno(anoLetivo, matricula, normalizada);

    // `gravarComAuditoria` devolve vazio quando nada mudou — aluno que já
    // estava nessa situação não conta como alterado.
    if (Object.keys(alteracoes).length > 0) alterados += 1;

    revalidatePath(`/gestao/alunos/${matricula}`);
  }

  revalidatePath("/gestao/alunos");
  revalidatePath("/gestao/alunos/situacao");

  return { ok: true, alterados };
}
