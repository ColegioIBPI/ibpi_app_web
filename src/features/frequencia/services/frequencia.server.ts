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
import {
  publicadasPara,
  type ParaPublicacao,
} from "@/features/frequencia/domain/publicacao";
import { contar, type Contadores } from "@/core/escola/frequencia";

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

/** O lançamento do dia com a autorização da ocorrência já anexada. */
export type LancamentoDoDia = LancamentoComId & Partial<ParaPublicacao>;

export interface OcorrenciaComId extends Ocorrencia {
  id: string;
}

/** Lançamentos de um dia numa turma — o que a chamada carrega ao abrir. */
export async function lancamentosDoDia(
  turmaId: string,
  data: string,
): Promise<LancamentoDoDia[]> {
  const docs = await getAdminDb()
    .collection(COLECOES.frequenciaDiaria)
    .where("turmaId", "==", turmaId)
    .where("data", "==", data)
    .get();

  const lancamentos = docs.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as FrequenciaDiaria),
  }));

  /**
   * A autorização de publicação mora no documento da **ocorrência**, e a
   * chamada precisa dela para reabrir com as caixas como foram deixadas.
   *
   * Sem isto, reabrir a chamada mostraria o padrão em vez do que a pessoa
   * marcou — e salvar de novo republicaria a ocorrência que ela tinha
   * retido, em silêncio.
   */
  const ocorrencias = await getAdminDb()
    .collection(COLECOES.ocorrencias)
    .where("turmaId", "==", turmaId)
    .where("data", "==", data)
    .get();

  const publicacao = new Map(
    ocorrencias.docs.map((doc) => {
      const ocorrencia = doc.data() as Ocorrencia;
      return [ocorrencia.matricula, ocorrencia] as const;
    }),
  );

  return lancamentos.map((lancamento) => {
    const ocorrencia = publicacao.get(lancamento.matricula);

    return ocorrencia
      ? {
          ...lancamento,
          visivelParaResponsavel: ocorrencia.visivelParaResponsavel,
          visivelParaAluno: ocorrencia.visivelParaAluno,
        }
      : lancamento;
  });
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

  /**
   * A família lê o que foi publicado para ela.
   *
   * O filtro é aqui, e não só na Security Rule, porque o Admin SDK ignora
   * as regras: o Portal montaria a lista inteira se dependesse delas.
   */
  if (escopo === "filhos") {
    return publicadasPara(
      ocorrencias.filter((o) => sessao.alunosVinculados.includes(o.matricula)),
      "responsavel",
    );
  }

  // O aluno lê as próprias, e só as marcadas para ele.
  if (escopo === "proprio") {
    if (!sessao.matricula) return [];

    return publicadasPara(
      ocorrencias.filter((o) => o.matricula === sessao.matricula),
      "aluno",
    );
  }

  if (escopo === "turmas-lecionadas") {
    const doc = await db.collection(COLECOES.users).doc(sessao.uid).get();
    const turmas = (doc.data()?.turmas as string[]) ?? [];
    return ocorrencias.filter((o) => turmas.includes(o.turmaId));
  }

  return ocorrencias;
}
