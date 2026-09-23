import "server-only";

import { COLECOES, type Alocacao, type Aluno } from "@/core/modelo";
import { isEquipe } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";

/**
 * Alocação: professor × turma × disciplina × ano letivo.
 *
 * É o registro que define o escopo de trabalho do professor, e vale tanto
 * para o diário de classe quanto para o lançamento de notas — por isso mora
 * aqui, e não dentro de uma das duas features.
 *
 * A verificação acontece no servidor porque o Admin SDK ignora as Security
 * Rules. Cada caminho de leitura e de escrita confere por conta própria.
 */

export interface AlocacaoComId extends Alocacao {
  id: string;
}

export interface AlunoDaTurma {
  matricula: string;
  nome: string;
}

/**
 * O id do cadastro de professor ligado a uma conta.
 *
 * Sem cadastro correspondente, devolve um sentinela que não casa com nada —
 * o resultado correto é "nenhuma alocação", e não "todas".
 */
export async function idDoProfessor(uid: string): Promise<string> {
  const docs = await getAdminDb()
    .collection(COLECOES.professores)
    .where("uid", "==", uid)
    .limit(1)
    .get();

  return docs.empty ? "__sem-cadastro__" : docs.docs[0].id;
}

/** Alocações que a pessoa pode abrir. */
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
    .filter((alocacao) => alocacao.ativa !== false)
    .sort(
      (a, b) =>
        (a.turmaCodigo ?? "").localeCompare(b.turmaCodigo ?? "", "pt-BR") ||
        (a.disciplinaNome ?? "").localeCompare(b.disciplinaNome ?? "", "pt-BR"),
    );
}

/**
 * A alocação, se a pessoa puder abri-la.
 *
 * Devolve `null` também quando ela existe mas é de outro professor: quem
 * chama responde 404 nos dois casos, porque dizer "existe, mas não é seu" já
 * entregaria que aquela turma tem aquela disciplina.
 */
export async function obterAlocacao(
  sessao: SessionUser,
  alocacaoId: string,
): Promise<Alocacao | null> {
  const doc = await getAdminDb()
    .collection(COLECOES.alocacoes)
    .doc(alocacaoId)
    .get();

  if (!doc.exists) return null;

  const alocacao = doc.data() as Alocacao;

  return (await podeAbrirAlocacao(sessao, alocacao)) ? alocacao : null;
}

export async function podeAbrirAlocacao(
  sessao: SessionUser,
  alocacao: Alocacao,
): Promise<boolean> {
  // Secretaria e coordenação conferem o trabalho do professor, então abrem
  // qualquer alocação.
  if (sessao.role === "secretaria" || sessao.role === "coordenacao") return true;
  if (!isEquipe(sessao.role)) return false;

  return alocacao.professorId === (await idDoProfessor(sessao.uid));
}

/** Alunos ativos da turma, na ordem em que aparecem na chamada. */
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
