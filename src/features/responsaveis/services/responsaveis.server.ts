import "server-only";

import { COLECOES, type Aluno, type Responsavel } from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";

/**
 * Leitura de responsáveis.
 *
 * Só secretaria e coordenação chegam aqui (a rota exige `gerenciar` em
 * cadastros), então não há recorte de escopo — diferente da listagem de
 * alunos, que o professor e o responsável também acessam.
 */

export interface ResponsavelComId extends Responsavel {
  id: string;
}

export interface AlunoResumido {
  matricula: string;
  nome: string;
  turmaCodigo: string | null;
  ativo: boolean;
}

export async function listarResponsaveis(): Promise<ResponsavelComId[]> {
  const docs = await getAdminDb().collection(COLECOES.responsaveis).get();

  return docs.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Responsavel) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterResponsavel(
  id: string,
): Promise<ResponsavelComId | null> {
  const doc = await getAdminDb()
    .collection(COLECOES.responsaveis)
    .doc(id)
    .get();

  return doc.exists ? { id: doc.id, ...(doc.data() as Responsavel) } : null;
}

/** Os filhos de um responsável, com o mínimo para exibir na ficha. */
export async function listarFilhos(
  matriculas: readonly string[],
): Promise<AlunoResumido[]> {
  if (matriculas.length === 0) return [];

  const db = getAdminDb();

  // `in` aceita até 30 valores; ninguém tem 30 filhos, mas o limite existe
  // e ignorá-lo é o tipo de coisa que quebra num caso raro.
  const lotes = await Promise.all(
    dividir([...matriculas], 30).map((lote) =>
      db.collection(COLECOES.alunos).where("matricula", "in", lote).get(),
    ),
  );

  return lotes
    .flatMap((lote) => lote.docs)
    .map((doc) => resumir(doc.data() as Aluno))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Responsáveis vinculados a um aluno — a visão inversa, usada na ficha. */
export async function listarResponsaveisDoAluno(
  matricula: string,
): Promise<ResponsavelComId[]> {
  const docs = await getAdminDb()
    .collection(COLECOES.responsaveis)
    .where("alunosVinculados", "array-contains", matricula)
    .get();

  return docs.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Responsavel) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Alunos disponíveis para vincular, já sem os que o responsável tem. */
export async function listarAlunosParaVincular(
  jaVinculados: readonly string[],
): Promise<AlunoResumido[]> {
  const docs = await getAdminDb()
    .collection(COLECOES.alunos)
    .where("ativo", "==", true)
    .get();

  return docs.docs
    .map((doc) => resumir(doc.data() as Aluno))
    .filter((aluno) => !jaVinculados.includes(aluno.matricula))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function resumir(aluno: Aluno): AlunoResumido {
  return {
    matricula: aluno.matricula,
    nome: aluno.nome,
    turmaCodigo: aluno.turmaCodigo ?? null,
    ativo: aluno.ativo,
  };
}

function dividir<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];

  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }

  return lotes;
}
