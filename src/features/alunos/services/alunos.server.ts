import "server-only";

import { COLECOES, type Aluno } from "@/core/modelo";
import { escopoDeAlunos } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";

/**
 * Leitura de alunos pelo servidor.
 *
 * Roda com o Admin SDK, que **ignora as Security Rules** — então o escopo
 * precisa ser aplicado aqui, explicitamente. É o preço de ler no servidor:
 * ganha-se busca e performance, e assume-se a responsabilidade que as regras
 * teriam assumido.
 */

export interface AlunoComId extends Aluno {
  id: string;
}

/**
 * Alunos que a sessão tem direito de ver.
 *
 * São 73 alunos: a listagem carrega todos e filtra em memória (ver
 * `domain/busca.ts`). Com uma base uma ordem de grandeza maior, isto vira
 * consulta paginada com índice.
 */
export async function listarAlunosVisiveis(
  sessao: SessionUser,
): Promise<AlunoComId[]> {
  const db = getAdminDb();
  const escopo = escopoDeAlunos(sessao.role);

  if (escopo === "proprio") {
    if (!sessao.matricula) return [];
    const doc = await db
      .collection(COLECOES.alunos)
      .doc(sessao.matricula)
      .get();
    return doc.exists ? [documento(doc)] : [];
  }

  if (escopo === "filhos") {
    return buscarPorMatriculas(sessao.alunosVinculados);
  }

  if (escopo === "turmas-lecionadas") {
    const turmas = await turmasDoProfessor(sessao.uid);
    if (turmas.length === 0) return [];

    // `in` aceita no máximo 30 valores por consulta.
    const lotes = await Promise.all(
      dividir(turmas, 30).map((lote) =>
        db.collection(COLECOES.alunos).where("turmaId", "in", lote).get(),
      ),
    );

    return lotes.flatMap((lote) => lote.docs.map(documento));
  }

  const todos = await db.collection(COLECOES.alunos).get();
  return todos.docs.map(documento);
}

/** Um aluno, respeitando o mesmo escopo da listagem. */
export async function obterAlunoVisivel(
  sessao: SessionUser,
  matricula: string,
): Promise<AlunoComId | null> {
  const doc = await getAdminDb()
    .collection(COLECOES.alunos)
    .doc(matricula)
    .get();

  if (!doc.exists) return null;

  const aluno = documento(doc);
  return (await podeVerAluno(sessao, aluno)) ? aluno : null;
}

async function podeVerAluno(
  sessao: SessionUser,
  aluno: AlunoComId,
): Promise<boolean> {
  switch (escopoDeAlunos(sessao.role)) {
    case "todos":
      return true;
    case "proprio":
      return sessao.matricula === aluno.matricula;
    case "filhos":
      return sessao.alunosVinculados.includes(aluno.matricula);
    case "turmas-lecionadas": {
      if (!aluno.turmaId) return false;
      const turmas = await turmasDoProfessor(sessao.uid);
      return turmas.includes(aluno.turmaId);
    }
  }
}

/**
 * Turmas do professor.
 *
 * Ficam desnormalizadas no documento em `users`, porque as Security Rules
 * também precisam delas a cada consulta e não conseguem cruzar coleções sem
 * custo.
 */
async function turmasDoProfessor(uid: string): Promise<string[]> {
  const doc = await getAdminDb().collection(COLECOES.users).doc(uid).get();
  const turmas = doc.data()?.turmas;

  return Array.isArray(turmas)
    ? turmas.filter((t): t is string => typeof t === "string")
    : [];
}

async function buscarPorMatriculas(
  matriculas: readonly string[],
): Promise<AlunoComId[]> {
  if (matriculas.length === 0) return [];

  const db = getAdminDb();
  const lotes = await Promise.all(
    dividir([...matriculas], 30).map((lote) =>
      db.collection(COLECOES.alunos).where("matricula", "in", lote).get(),
    ),
  );

  return lotes.flatMap((lote) => lote.docs.map(documento));
}

function documento(doc: FirebaseFirestore.DocumentSnapshot): AlunoComId {
  return { id: doc.id, ...(doc.data() as Aluno) };
}

function dividir<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];

  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }

  return lotes;
}
