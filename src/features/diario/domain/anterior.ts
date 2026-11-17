/**
 * O diário do professor anterior.
 *
 * Trocar o professor de uma disciplina no meio do ano **não perde nada**:
 * nota, chamada do dia e ocorrência pertencem à turma e à disciplina, não
 * a quem lançou. O diário de classe é a exceção — o id dele é o da
 * alocação, e o da alocação inclui o professor
 * (`{ano}-{professor}-{turma}-{disciplina}`). Professor novo, alocação
 * nova, diário novo e em branco.
 *
 * O diário velho nunca é apagado: remover uma alocação a **desativa**. Mas
 * a lista de diários só mostra alocação ativa, então ele sumia da tela —
 * estava no banco e ninguém achava. É esse buraco que este arquivo fecha.
 */

export interface ParaComparar {
  id: string;
  anoLetivo: number;
  turmaId: string;
  disciplinaId: string;
  professorNome?: string;
}

/**
 * As outras alocações da **mesma turma, disciplina e ano**.
 *
 * Não filtra por `ativa` de propósito. Durante a passagem de bastão as
 * duas convivem ativas por um tempo, e é justamente aí que o professor
 * novo mais precisa ler o que já foi dado — ele não consegue abrir a
 * alocação do outro nem quando ela está ativa.
 *
 * Comparar o id basta para excluir a alocação atual, e de quebra garante
 * que o professor é outro: o id carrega o professor, então duas alocações
 * da mesma pessoa na mesma turma e disciplina teriam o mesmo id.
 */
export function outrasDaMesmaDisciplina<T extends ParaComparar>(
  alocacoes: readonly T[],
  atual: ParaComparar,
): T[] {
  return alocacoes
    .filter(
      (alocacao) =>
        alocacao.id !== atual.id &&
        alocacao.anoLetivo === atual.anoLetivo &&
        alocacao.turmaId === atual.turmaId &&
        alocacao.disciplinaId === atual.disciplinaId,
    )
    .sort((a, b) =>
      (a.professorNome ?? "").localeCompare(b.professorNome ?? "", "pt-BR"),
    );
}
