import "server-only";

import {
  COLECOES,
  type FrequenciaDiaria,
  type Ocorrencia,
  type SituacaoDePresenca,
} from "@/core/modelo";
import { escopoDeAlunos } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import { contar, type Contadores } from "@/features/frequencia/domain/calculos";

/**
 * Leitura de frequência e ocorrências.
 *
 * O escopo é aplicado aqui — o Admin SDK ignora as Security Rules. Falta e
 * ocorrência disciplinar são dado sensível: o aluno vê a própria frequência,
 * mas **não** a própria ocorrência, que é tratada com o responsável.
 */

export interface LancamentoComId extends FrequenciaDiaria {
  id: string;
}

export interface OcorrenciaComId extends Ocorrencia {
  id: string;
}

/** Lançamentos de um dia numa turma — o que a chamada carrega ao abrir. */
export async function lancamentosDoDia(
  turmaId: string,
  data: string,
): Promise<LancamentoComId[]> {
  const docs = await getAdminDb()
    .collection(COLECOES.frequenciaDiaria)
    .where("turmaId", "==", turmaId)
    .where("data", "==", data)
    .get();

  return docs.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as FrequenciaDiaria),
  }));
}

/** Frequência de um aluno, com os contadores já calculados. */
export async function frequenciaDoAluno(
  matricula: string,
): Promise<{ lancamentos: LancamentoComId[]; contadores: Contadores }> {
  const docs = await getAdminDb()
    .collection(COLECOES.frequenciaDiaria)
    .where("matricula", "==", matricula)
    .get();

  const lancamentos = docs.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as FrequenciaDiaria) }))
    .sort((a, b) => b.data.localeCompare(a.data));

  return {
    lancamentos,
    contadores: contar(
      lancamentos.map((l) => l.situacao as SituacaoDePresenca),
    ),
  };
}

/**
 * Ocorrências que a sessão pode ver.
 *
 * O aluno não entra aqui: a ocorrência disciplinar dele é assunto do
 * responsável e da equipe (README, seção 3.2).
 */
export async function ocorrenciasVisiveis(
  sessao: SessionUser,
  filtro: { matricula?: string; turmaId?: string } = {},
): Promise<OcorrenciaComId[]> {
  const escopo = escopoDeAlunos(sessao.role);
  if (escopo === "proprio") return [];

  const db = getAdminDb();
  let consulta: FirebaseFirestore.Query = db.collection(COLECOES.ocorrencias);

  if (filtro.matricula) {
    consulta = consulta.where("matricula", "==", filtro.matricula);
  } else if (filtro.turmaId) {
    consulta = consulta.where("turmaId", "==", filtro.turmaId);
  }

  const docs = await consulta.get();

  const ocorrencias = docs.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Ocorrencia) }))
    .sort((a, b) => b.data.localeCompare(a.data));

  if (escopo === "filhos") {
    return ocorrencias.filter((o) =>
      sessao.alunosVinculados.includes(o.matricula),
    );
  }

  if (escopo === "turmas-lecionadas") {
    const doc = await db.collection(COLECOES.users).doc(sessao.uid).get();
    const turmas = (doc.data()?.turmas as string[]) ?? [];
    return ocorrencias.filter((o) => turmas.includes(o.turmaId));
  }

  return ocorrencias;
}
