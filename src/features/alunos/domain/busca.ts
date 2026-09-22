import { chaveDeComparacao } from "@/features/migracao/domain/texto";

/**
 * Busca e ordenação da listagem de alunos.
 *
 * O Firestore não tem busca textual: `where("nome", ">=", termo)` só casa
 * prefixo exato, com acento e caixa. Como o colégio tem 73 alunos, a
 * listagem carrega todos no servidor e filtra em memória — o que dá busca
 * por qualquer parte do nome, sem acento, e custa menos que manter um índice
 * externo.
 *
 * Se a base crescer uma ordem de grandeza, a troca é por um índice de busca
 * (Algolia, Typesense) ou por um campo de tokens no documento. Até lá, isto
 * é mais simples e melhor.
 */

export interface AlunoDaListagem {
  matricula: string;
  nome: string;
  turmaCodigo?: string | null;
  turno?: string | null;
  ativo: boolean;
}

export interface FiltroDeAlunos {
  termo?: string;
  turma?: string;
  /** `todos` inclui ex-alunos; o padrão mostra só quem está matriculado. */
  situacao?: "ativos" | "inativos" | "todos";
}

export function filtrarAlunos<T extends AlunoDaListagem>(
  alunos: readonly T[],
  filtro: FiltroDeAlunos = {},
): T[] {
  const termo = chaveDeComparacao(filtro.termo ?? "");
  const situacao = filtro.situacao ?? "ativos";

  return alunos.filter((aluno) => {
    if (situacao === "ativos" && !aluno.ativo) return false;
    if (situacao === "inativos" && aluno.ativo) return false;

    if (filtro.turma && aluno.turmaCodigo !== filtro.turma) return false;

    if (!termo) return true;

    // Busca por qualquer parte do nome ou pela matrícula: a secretaria
    // digita tanto "alice" quanto "26007".
    return (
      chaveDeComparacao(aluno.nome).includes(termo) ||
      aluno.matricula.includes(termo)
    );
  });
}

/** Ordem alfabética em pt-BR, ignorando acento. */
export function ordenarPorNome<T extends AlunoDaListagem>(
  alunos: readonly T[],
): T[] {
  return [...alunos].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
  );
}

/** Turmas presentes na lista, para montar o filtro sem consulta extra. */
export function turmasDaLista(alunos: readonly AlunoDaListagem[]): string[] {
  const codigos = new Set<string>();

  for (const aluno of alunos) {
    if (aluno.turmaCodigo) codigos.add(aluno.turmaCodigo);
  }

  return [...codigos].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
