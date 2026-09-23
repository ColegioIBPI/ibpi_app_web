import "server-only";

import {
  COLECOES,
  type Alocacao,
  type Aluno,
  type DiarioDeClasse,
  type Trimestre,
} from "@/core/modelo";
import { isEquipe } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import { idDoDiario } from "@/features/diario/domain/aulas";

/**
 * Leitura do diário de classe.
 *
 * O professor só alcança as alocações dele — é a mesma regra de escopo do
 * resto do sistema, aplicada aqui porque o Admin SDK ignora as Security
 * Rules. Secretaria e coordenação leem todos, porque conferem o diário.
 */

export interface DiarioComId extends DiarioDeClasse {
  id: string;
}

export interface AlocacaoComId extends Alocacao {
  id: string;
}

export interface AlunoDaTurma {
  matricula: string;
  nome: string;
}

/** Alocações que a pessoa pode abrir no diário. */
export async function alocacoesVisiveis(
  sessao: SessionUser,
): Promise<AlocacaoComId[]> {
  const db = getAdminDb();

  const consulta =
    sessao.role === "professor"
      ? db
          .collection(COLECOES.alocacoes)
          .where("professorId", "==", await idDoProfessor(sessao.uid))
      : db.collection(COLECOES.alocacoes);

  const docs = await consulta.get();

  return docs.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Alocacao) }))
    .filter((a) => a.ativa !== false)
    .sort(
      (a, b) =>
        (a.turmaCodigo ?? "").localeCompare(b.turmaCodigo ?? "", "pt-BR") ||
        (a.disciplinaNome ?? "").localeCompare(b.disciplinaNome ?? "", "pt-BR"),
    );
}

/** O id do cadastro do professor, a partir da conta. */
export async function idDoProfessor(uid: string): Promise<string> {
  const docs = await getAdminDb()
    .collection(COLECOES.professores)
    .where("uid", "==", uid)
    .limit(1)
    .get();

  // Sem cadastro correspondente, a consulta por `professorId` não casa com
  // nada — que é o resultado correto: a pessoa não tem alocação.
  return docs.empty ? "__sem-cadastro__" : docs.docs[0].id;
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
  const db = getAdminDb();
  const alocacaoDoc = await db
    .collection(COLECOES.alocacoes)
    .doc(alocacaoId)
    .get();

  if (!alocacaoDoc.exists) return null;

  const alocacao = alocacaoDoc.data() as Alocacao;

  if (!(await podeAbrir(sessao, alocacao))) return null;

  const doc = await db
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

async function podeAbrir(
  sessao: SessionUser,
  alocacao: Alocacao,
): Promise<boolean> {
  if (sessao.role === "secretaria" || sessao.role === "coordenacao") return true;
  if (!isEquipe(sessao.role)) return false;

  return alocacao.professorId === (await idDoProfessor(sessao.uid));
}

/** Alunos da turma, na ordem em que o professor faz a chamada. */
export async function alunosDaTurma(
  turmaId: string,
): Promise<AlunoDaTurma[]> {
  const docs = await getAdminDb()
    .collection(COLECOES.alunos)
    .where("turmaId", "==", turmaId)
    .where("ativo", "==", true)
    .get();

  return docs.docs
    .map((doc) => doc.data() as Aluno)
    .map((aluno) => ({ matricula: aluno.matricula, nome: aluno.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
