import "server-only";

import {
  COLECOES,
  type Alocacao,
  type DiarioDeClasse,
  type Trimestre,
} from "@/core/modelo";
import type { SessionUser } from "@/core/auth/session";
import { obterAlocacao } from "@/core/escola/alocacoes.server";
import { getAdminDb } from "@/core/firebase/admin";
import { idDoDiario, resumirAulas, type ResumoDaAula } from "@/core/escola/aulas";
import { outrasDaMesmaDisciplina } from "@/features/diario/domain/anterior";

/**
 * Leitura do diário de classe.
 *
 * O escopo vem de `core/escola/alocacoes.server`: o professor só alcança as
 * alocações dele, e a verificação é feita aqui porque o Admin SDK ignora as
 * Security Rules. Secretaria e coordenação leem todos, porque conferem o
 * diário.
 */

export interface DiarioComId extends DiarioDeClasse {
  id: string;
}

/**
 * O diário daquela alocação e trimestre, se a pessoa puder abri-lo.
 *
 * Devolve `null` quando o professor tenta um diário que não é dele — e não
 * um erro diferente, pelo mesmo motivo de sempre: dizer "existe, mas não é
 * seu" já entrega informação.
 */
export async function obterDiario(
  sessao: SessionUser,
  alocacaoId: string,
  trimestre: Trimestre,
): Promise<{ diario: DiarioComId | null; alocacao: Alocacao } | null> {
  const alocacao = await obterAlocacao(sessao, alocacaoId);
  if (!alocacao) return null;

  const doc = await getAdminDb()
    .collection(COLECOES.diarioClasse)
    .doc(idDoDiario(alocacaoId, trimestre))
    .get();

  return {
    alocacao,
    diario: doc.exists
      ? { id: doc.id, ...(doc.data() as DiarioDeClasse) }
      : null,
  };
}

export interface DiarioAnterior {
  alocacaoId: string;
  professorNome: string;
  /** A alocação ainda vale? `false` é o professor que já saiu. */
  ativa: boolean;
  aulas: ResumoDaAula[];
}

/**
 * Os diários de **outros professores** na mesma turma e disciplina.
 *
 * Existe porque trocar o professor cria um diário novo e em branco: o id
 * do diário é o da alocação, e o da alocação inclui o professor. Ver
 * `domain/anterior.ts`.
 *
 * **A autorização é herdada, e isso é deliberado.** Esta função recebe a
 * alocação que quem chamou já abriu legitimamente — nunca um id vindo da
 * URL — e só devolve diários do mesmo ano, da mesma turma e da mesma
 * disciplina. Quem pode ler o conteúdo dado nessa disciplina este ano
 * pode ler o que o colega deu antes dele; o que ela não pode é virar um
 * caminho para outra turma ou outra matéria.
 *
 * Devolve só o **resumo** das aulas. O diário anterior é para ler o que
 * foi dado, não para reabrir a chamada de quem já saiu — e a falta
 * continua contando para o aluno de qualquer forma, porque a frequência
 * por disciplina soma todos os diários da turma.
 */
export async function diariosAnteriores(
  alocacaoAtualId: string,
  alocacao: Alocacao,
  trimestre: Trimestre,
): Promise<DiarioAnterior[]> {
  const db = getAdminDb();

  // Por `turmaId` só: são poucas alocações por turma, e filtrar ano e
  // disciplina em memória evita pedir um índice composto ao Firestore.
  const docs = await db
    .collection(COLECOES.alocacoes)
    .where("turmaId", "==", alocacao.turmaId)
    .get();

  const irmas = outrasDaMesmaDisciplina(
    docs.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Alocacao) })),
    { id: alocacaoAtualId, ...alocacao },
  );

  if (irmas.length === 0) return [];

  const diarios = await db.getAll(
    ...irmas.map((irma) =>
      db.collection(COLECOES.diarioClasse).doc(idDoDiario(irma.id, trimestre)),
    ),
  );

  return irmas
    .map((irma, indice) => {
      const dados = diarios[indice].data() as DiarioDeClasse | undefined;

      return {
        alocacaoId: irma.id,
        professorNome: irma.professorNome ?? "Professor não informado",
        ativa: irma.ativa !== false,
        aulas: resumirAulas(dados?.aulas ?? []),
      };
    })
    // Alocação sem aula lançada naquele trimestre não vira bloco vazio: o
    // professor anterior pode ter assumido só no trimestre seguinte.
    .filter((anterior) => anterior.aulas.length > 0);
}
