/**
 * Qual filho está selecionado no contexto do responsável.
 *
 * Um responsável pode ter vários filhos matriculados, e o sistema inteiro
 * (boletim, frequência, financeiro) mostra os dados de um por vez. Esta é a
 * regra de qual deles, mantida pura para não depender de armazenamento.
 */
export function resolverAlunoSelecionado(
  vinculados: readonly string[],
  salvo?: string | null,
): string | null {
  if (vinculados.length === 0) return null;

  // Uma seleção guardada só vale se o vínculo ainda existir: filho que
  // trocou de escola, ou responsável que perdeu o vínculo, não pode
  // continuar selecionado por causa de um valor velho no navegador.
  if (salvo && vinculados.includes(salvo)) return salvo;

  return vinculados[0];
}

/** O seletor só faz sentido quando há mais de um filho. */
export function precisaDeSeletor(vinculados: readonly string[]): boolean {
  return vinculados.length > 1;
}
