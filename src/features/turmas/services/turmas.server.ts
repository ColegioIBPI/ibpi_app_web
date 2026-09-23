import "server-only";

import { COLECOES, type Disciplina, type Turma } from "@/core/modelo";
import { escopoDeAlunos } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import type { AlunoComId } from "@/features/alunos/services/alunos.server";

/**
 * Leitura de turmas e disciplinas.
 *
 * Turma e disciplina não são dado pessoal — qualquer pessoa autenticada pode
 * lê-las, e é isso que permite montar os rótulos das telas sem uma consulta
 * privilegiada por linha. O que é sensível é a **lista de alunos** da turma,
 * e essa respeita o escopo.
 */

export interface TurmaComId extends Turma {
  id: string;
  /** Quantos alunos matriculados — calculado, não gravado. */
  totalDeAlunos?: number;
}

export interface DisciplinaComId extends Disciplina {
  id: string;
}

export async function listarTurmas(anoLetivo?: number): Promise<TurmaComId[]> {
  const db = getAdminDb();
  const consulta = anoLetivo
    ? db.collection(COLECOES.turmas).where("anoLetivo", "==", anoLetivo)
    : db.collection(COLECOES.turmas);

  const [turmas, alunos] = await Promise.all([
    consulta.get(),
    db.collection(COLECOES.alunos).where("ativo", "==", true).get(),
  ]);

  // Contagem em memória: são 10 turmas e 73 alunos. Um contador gravado no
  // documento seria mais rápido e exigiria manter sincronia a cada
  // matrícula — complexidade que esta escala não paga.
  const porTurma = new Map<string, number>();
  for (const aluno of alunos.docs) {
    const turmaId = aluno.data().turmaId;
    if (typeof turmaId === "string") {
      porTurma.set(turmaId, (porTurma.get(turmaId) ?? 0) + 1);
    }
  }

  return turmas.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as Turma),
      totalDeAlunos: porTurma.get(doc.id) ?? 0,
    }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));
}

export async function obterTurma(id: string): Promise<TurmaComId | null> {
  const doc = await getAdminDb().collection(COLECOES.turmas).doc(id).get();
  return doc.exists ? { id: doc.id, ...(doc.data() as Turma) } : null;
}

/**
 * Alunos da turma, dentro do escopo de quem consulta.
 *
 * O Admin SDK ignora as Security Rules, então o recorte é aplicado aqui:
 * professor de outra turma não recebe a lista, e responsável só vê o próprio
 * filho mesmo abrindo a turma inteira.
 */
export async function listarAlunosDaTurma(
  sessao: SessionUser,
  turmaId: string,
): Promise<AlunoComId[]> {
  const escopo = escopoDeAlunos(sessao.role);

  if (escopo === "turmas-lecionadas") {
    const doc = await getAdminDb()
      .collection(COLECOES.users)
      .doc(sessao.uid)
      .get();
    const turmas = doc.data()?.turmas;
    const lecionadas = Array.isArray(turmas) ? turmas : [];

    if (!lecionadas.includes(turmaId)) return [];
  }

  const alunos = await getAdminDb()
    .collection(COLECOES.alunos)
    .where("turmaId", "==", turmaId)
    .get();

  const todos: AlunoComId[] = alunos.docs.map((doc) => ({
    ...(doc.data() as Omit<AlunoComId, "id">),
    id: doc.id,
  }));

  if (escopo === "proprio") {
    return todos.filter((aluno) => aluno.matricula === sessao.matricula);
  }

  if (escopo === "filhos") {
    return todos.filter((aluno) =>
      sessao.alunosVinculados.includes(aluno.matricula),
    );
  }

  return todos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function listarDisciplinas(): Promise<DisciplinaComId[]> {
  const docs = await getAdminDb().collection(COLECOES.disciplinas).get();

  return docs.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Disciplina) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterDisciplina(
  id: string,
): Promise<DisciplinaComId | null> {
  const doc = await getAdminDb().collection(COLECOES.disciplinas).doc(id).get();
  return doc.exists ? { id: doc.id, ...(doc.data() as Disciplina) } : null;
}
