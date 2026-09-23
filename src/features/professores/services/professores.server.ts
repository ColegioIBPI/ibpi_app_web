import "server-only";

import {
  COLECOES,
  type Alocacao,
  type Disciplina,
  type Professor,
  type Turma,
} from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";

/**
 * Leitura de professores e alocações.
 *
 * Só secretaria e coordenação chegam aqui — a rota exige `gerenciar` em
 * cadastros. O professor vê o próprio cadastro pelas telas dele, não por
 * esta listagem.
 */

export interface ProfessorComId extends Professor {
  id: string;
}

export interface AlocacaoComId extends Alocacao {
  id: string;
}

export async function listarProfessores(): Promise<ProfessorComId[]> {
  const docs = await getAdminDb().collection(COLECOES.professores).get();

  return docs.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Professor) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterProfessor(
  id: string,
): Promise<ProfessorComId | null> {
  const doc = await getAdminDb().collection(COLECOES.professores).doc(id).get();
  return doc.exists ? { id: doc.id, ...(doc.data() as Professor) } : null;
}

export async function alocacoesDoProfessor(
  professorId: string,
): Promise<AlocacaoComId[]> {
  const docs = await getAdminDb()
    .collection(COLECOES.alocacoes)
    .where("professorId", "==", professorId)
    .get();

  return docs.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Alocacao) }))
    .sort(
      (a, b) =>
        b.anoLetivo - a.anoLetivo ||
        (a.turmaCodigo ?? "").localeCompare(b.turmaCodigo ?? "", "pt-BR") ||
        (a.disciplinaNome ?? "").localeCompare(b.disciplinaNome ?? "", "pt-BR"),
    );
}

/** Professores que lecionam numa turma — usado na tela da turma. */
export async function alocacoesDaTurma(
  turmaId: string,
): Promise<AlocacaoComId[]> {
  const docs = await getAdminDb()
    .collection(COLECOES.alocacoes)
    .where("turmaId", "==", turmaId)
    .get();

  return docs.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Alocacao) }))
    .filter((a) => a.ativa !== false)
    .sort((a, b) =>
      (a.disciplinaNome ?? "").localeCompare(b.disciplinaNome ?? "", "pt-BR"),
    );
}

/** Turmas e disciplinas para os seletores do formulário de alocação. */
export async function opcoesDeAlocacao(): Promise<{
  turmas: { valor: string; rotulo: string; anoLetivo: number }[];
  disciplinas: { valor: string; rotulo: string }[];
}> {
  const db = getAdminDb();

  const [turmasDocs, disciplinasDocs] = await Promise.all([
    db.collection(COLECOES.turmas).get(),
    db.collection(COLECOES.disciplinas).get(),
  ]);

  return {
    turmas: turmasDocs.docs
      .map((doc) => {
        const turma = doc.data() as Turma;
        return {
          valor: doc.id,
          rotulo: turma.codigo,
          anoLetivo: turma.anoLetivo,
        };
      })
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR")),

    disciplinas: disciplinasDocs.docs
      .map((doc) => {
        const disciplina = doc.data() as Disciplina;
        return { valor: doc.id, rotulo: disciplina.nome };
      })
      .filter((d) => d.rotulo)
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR")),
  };
}
