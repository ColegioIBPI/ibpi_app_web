/**
 * Ordem de uma lista que a secretaria organiza à mão.
 *
 * A posição é a que ela definiu, e um rótulo desempata. Sem o desempate,
 * dois itens com a mesma posição trocariam de lugar entre uma visita e
 * outra: o Firestore não promete ordem estável, e o Portal e o aplicativo
 * leem a mesma coleção.
 *
 * Mora em `core` porque já serve as informações úteis e o catálogo de
 * documentos. Uma feature não pode importar o domínio da outra.
 */
export function ordenarPorOrdem<T extends { ordem?: number | null }>(
  itens: readonly T[],
  rotulo: (item: T) => string,
): T[] {
  return [...itens].sort(
    (a, b) =>
      (a.ordem ?? 0) - (b.ordem ?? 0) ||
      rotulo(a).localeCompare(rotulo(b), "pt-BR"),
  );
}
