import "server-only";

import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type CriterioComId } from "@/core/modelo";

/**
 * Leitura dos critérios de avaliação.
 *
 * O id é o ano letivo — ou `{ano}-{curso}` quando o critério é de um curso
 * só. O de 2026 não substitui o de 2025: boletim fechado continua valendo
 * pelo critério do ano dele.
 */

export function idDoCriterio(anoLetivo: number, cursoCodigo: string | null) {
  return cursoCodigo ? `${anoLetivo}-${cursoCodigo}` : String(anoLetivo);
}

export async function listarCriterios(): Promise<CriterioComId[]> {
  const resultado = await getAdminDb()
    .collection(COLECOES.criteriosDeAvaliacao)
    .orderBy("anoLetivo", "desc")
    .get();

  return resultado.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as CriterioComId,
  );
}

export async function obterCriterio(id: string): Promise<CriterioComId | null> {
  const doc = await getAdminDb()
    .collection(COLECOES.criteriosDeAvaliacao)
    .doc(id)
    .get();

  return doc.exists ? ({ id: doc.id, ...doc.data() } as CriterioComId) : null;
}
