import "server-only";

import {
  COLECOES,
  type Alocacao,
  type Boletim,
  type DiarioDeClasse,
  type FrequenciaDiaria,
  type Nota,
  type SituacaoDePresenca,
  type Trimestre,
} from "@/core/modelo";
import type { SessionUser } from "@/core/auth/session";
import {
  alunosDaTurma,
  obterAlocacao,
  type AlunoDaTurma,
} from "@/core/escola/alocacoes.server";
import { faltasNaDisciplina, idDoDiario } from "@/core/escola/aulas";
import { contar, percentualDePresenca } from "@/core/escola/frequencia";
import { getAdminDb } from "@/core/firebase/admin";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";
import { montarBoletim, type BoletimMontado } from "@/features/notas/domain/boletim";

/**
 * Leitura de notas e boletim.
 *
 * O escopo é aplicado aqui, porque o Admin SDK ignora as Security Rules:
 * o professor lança só nas disciplinas em que está alocado, e o boletim
 * segue o mesmo escopo de aluno do resto do sistema.
 */

export interface ContextoDeLancamento {
  alocacao: Alocacao;
  alunos: AlunoDaTurma[];
  notas: Nota[];
  /** Faltas contadas no diário de classe, por matrícula. */
  faltasDoDiario: Record<string, number>;
}

/**
 * O que a tela de lançamento precisa, se a pessoa puder abrir a alocação.
 *
 * `null` tanto para alocação inexistente quanto para a de outro professor —
 * quem chama responde 404 nos dois casos.
 */
export async function contextoDeLancamento(
  sessao: SessionUser,
  alocacaoId: string,
  trimestre: Trimestre,
): Promise<ContextoDeLancamento | null> {
  const alocacao = await obterAlocacao(sessao, alocacaoId);
  if (!alocacao) return null;

  const db = getAdminDb();

  const [alunos, notasDocs, diarioDoc] = await Promise.all([
    alunosDaTurma(alocacao.turmaId),
    db
      .collection(COLECOES.notas)
      .where("anoLetivo", "==", alocacao.anoLetivo)
      .where("trimestre", "==", trimestre)
      .where("turmaId", "==", alocacao.turmaId)
      .where("disciplinaId", "==", alocacao.disciplinaId)
      .get(),
    db
      .collection(COLECOES.diarioClasse)
      .doc(idDoDiario(alocacaoId, trimestre))
      .get(),
  ]);

  const aulas = diarioDoc.exists
    ? ((diarioDoc.data() as DiarioDeClasse).aulas ?? [])
    : [];

  const faltasDoDiario: Record<string, number> = {};
  for (const aluno of alunos) {
    faltasDoDiario[aluno.matricula] = faltasNaDisciplina(aulas, aluno.matricula);
  }

  return {
    alocacao,
    alunos,
    notas: notasDocs.docs.map((doc) => doc.data() as Nota),
    faltasDoDiario,
  };
}

export interface BoletimDoAluno extends BoletimMontado {
  matricula: string;
  nome: string;
  turmaCodigo: string | null;
  anoLetivo: number;
  percentualDeFrequencia: number | null;
  documento: Boletim | null;
}

/**
 * Boletim de um aluno, montado a partir das notas.
 *
 * `null` quando a sessão não tem direito de ver aquele aluno — o mesmo
 * escopo da listagem de alunos, aplicado pelo mesmo serviço.
 */
export async function boletimDoAluno(
  sessao: SessionUser,
  matricula: string,
  anoLetivo: number,
): Promise<BoletimDoAluno | null> {
  const aluno = await obterAlunoVisivel(sessao, matricula);
  if (!aluno) return null;

  const db = getAdminDb();

  const [notasDocs, boletimDoc, percentual] = await Promise.all([
    db
      .collection(COLECOES.notas)
      .where("matricula", "==", matricula)
      .where("anoLetivo", "==", anoLetivo)
      .get(),
    db.collection(COLECOES.boletins).doc(idDoBoletim(anoLetivo, matricula)).get(),
    frequenciaGeral(matricula),
  ]);

  const documento = boletimDoc.exists ? (boletimDoc.data() as Boletim) : null;

  return {
    matricula,
    nome: aluno.nome,
    turmaCodigo: aluno.turmaCodigo ?? null,
    anoLetivo,
    percentualDeFrequencia: percentual,
    documento,
    ...montarBoletim({
      notas: notasDocs.docs.map((doc) => doc.data() as Nota),
      recuperacoes: documento?.recuperacoes ?? {},
      dependencias: documento?.dependencias ?? [],
      percentualDeFrequencia: percentual,
    }),
  };
}

/** Id do boletim: um por aluno por ano letivo. */
export function idDoBoletim(anoLetivo: number, matricula: string): string {
  return `${anoLetivo}-${matricula}`;
}

/**
 * Frequência geral do aluno no ano, do registro diário da secretaria.
 *
 * É ela que decide a reprovação por falta, porque o limite de 25% é da
 * carga horária total — não da disciplina. A falta por disciplina, contada
 * no diário do professor, aparece no boletim como informação.
 */
export async function frequenciaGeral(
  matricula: string,
): Promise<number | null> {
  const docs = await getAdminDb()
    .collection(COLECOES.frequenciaDiaria)
    .where("matricula", "==", matricula)
    .get();

  return percentualDePresenca(
    contar(
      docs.docs.map(
        (doc) => (doc.data() as FrequenciaDiaria).situacao as SituacaoDePresenca,
      ),
    ),
  );
}
