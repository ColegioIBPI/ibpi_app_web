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

  const [turmas, alunos, registros] = await Promise.all([
    consulta.get(),
    db.collection(COLECOES.alunos).where("ativo", "==", true).get(),
    anoLetivo
      ? db
          .collection(COLECOES.matriculas)
          .where("anoLetivo", "==", anoLetivo)
          .get()
      : null,
  ]);

  // Contagem em memória: são 10 turmas e 73 alunos. Um contador gravado no
  // documento seria mais rápido e exigiria manter sincronia a cada
  // matrícula — complexidade que esta escala não paga.
  const porTurma = new Map<string, number>();
  const somar = (turmaId: unknown) => {
    if (typeof turmaId === "string" && turmaId) {
      porTurma.set(turmaId, (porTurma.get(turmaId) ?? 0) + 1);
    }
  };

  /*
    Com ano, a conta sai do **registro de matrícula daquele ano**, e não
    do cadastro: o cadastro aponta para a turma de hoje, e depois da
    virada ele esvaziaria as turmas de 2026 e encheria as de 2027.

    O `ativo` continua vindo do cadastro, porque é ele que a tela de
    situação mantém — assim o número da turma bate com a lista de alunos
    daquele ano, que usa o mesmo critério.
  */
  if (registros && !registros.empty) {
    const ativos = new Set(alunos.docs.map((doc) => doc.id));

    for (const registro of registros.docs) {
      const { matricula, turmaId } = registro.data();
      if (ativos.has(matricula as string)) somar(turmaId);
    }
  } else {
    for (const aluno of alunos.docs) somar(aluno.data().turmaId);
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
