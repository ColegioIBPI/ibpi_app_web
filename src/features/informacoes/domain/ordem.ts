import type { Informacao } from "@/core/modelo";

/**
 * Ordem dos cards na tela.
 *
 * A que a secretaria definiu, e o título para desempatar: sem o desempate,
 * dois cards com a mesma ordem trocariam de lugar entre uma visita e outra,
 * porque o Firestore não promete ordem estável e o app e o Portal leem a
 * mesma coleção.
 */
export function ordenarCards<T extends Pick<Informacao, "ordem" | "titulo">>(
  cards: T[],
): T[] {
  return [...cards].sort(
    (a, b) =>
      (a.ordem ?? 0) - (b.ordem ?? 0) ||
      a.titulo.localeCompare(b.titulo, "pt-BR"),
  );
}
