import "server-only";

import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Responsavel } from "@/core/modelo";
import { listarAlunosVisiveis } from "@/features/alunos/services/alunos.server";
import {
  parcelasAbertas,
  type CobrancaComId,
  type ParcelaAberta,
  type ResponsavelDoRelatorio,
} from "@/features/financeiro/domain/abertas";

/**
 * As parcelas em aberto da escola, com os responsáveis de cada aluno.
 *
 * Carrega aqui, e não em cada relatório, porque **a planilha e a folha
 * impressa são o mesmo dado visto de dois jeitos**. Duas leituras
 * separadas é como elas passam a discordar — e a conversa com a família
 * seria sobre qual das duas vale.
 *
 * O escopo da sessão é aplicado pelos **alunos**: parcela de aluno fora do
 * escopo não entra nem com o nome em branco.
 */
export async function parcelasEmAbertoDaEscola(
  sessao: SessionUser,
  filtro: { turma?: string } = {},
  hoje = new Date(),
): Promise<{
  parcelas: ParcelaAberta[];
  responsaveisPorAluno: Map<string, ResponsavelDoRelatorio[]>;
}> {
  const db = getAdminDb();

  const [alunos, cobrancasDocs, responsaveisDocs] = await Promise.all([
    listarAlunosVisiveis(sessao),
    db.collection(COLECOES.cobrancas).get(),
    db.collection(COLECOES.responsaveis).get(),
  ]);

  const noEscopo = alunos.filter(
    (aluno) => !filtro.turma || aluno.turmaCodigo === filtro.turma,
  );

  const porMatricula = new Map(
    noEscopo.map((aluno) => [
      aluno.matricula,
      {
        matricula: aluno.matricula,
        nome: aluno.nome,
        turmaCodigo: aluno.turmaCodigo ?? null,
      },
    ]),
  );

  const responsaveisPorAluno = new Map<string, ResponsavelDoRelatorio[]>();
  for (const doc of responsaveisDocs.docs) {
    const responsavel = doc.data() as Responsavel;

    for (const matricula of responsavel.alunosVinculados ?? []) {
      responsaveisPorAluno.set(matricula, [
        ...(responsaveisPorAluno.get(matricula) ?? []),
        responsavel,
      ]);
    }
  }

  const cobrancas = cobrancasDocs.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as CobrancaComId)
    .filter((cobranca) => porMatricula.has(cobranca.matricula));

  return {
    parcelas: parcelasAbertas(cobrancas, porMatricula, hoje),
    responsaveisPorAluno,
  };
}
