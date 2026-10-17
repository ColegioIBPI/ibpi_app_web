import "server-only";

import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  type ReciboComId,
  type SerieDeRecibos,
} from "@/core/modelo";

/**
 * Leitura dos recibos.
 *
 * O escopo não é por aluno aqui, e sim por perfil: quem tem o recurso
 * `recibos` é equipe de caixa ou de balcão, e precisa achar o recibo pelo
 * número mesmo sem saber de quem ele é — que é exatamente a situação em que
 * alguém chega com o papel na mão.
 */

const LIMITE = 200;

export interface FiltroDeRecibos {
  matricula?: string;
  serie?: string;
}

export async function listarRecibos(
  filtro: FiltroDeRecibos = {},
): Promise<ReciboComId[]> {
  let consulta = getAdminDb()
    .collection(COLECOES.recibos)
    .orderBy("emitidoEm", "desc")
    .limit(LIMITE);

  if (filtro.matricula) {
    consulta = consulta.where("aluno.matricula", "==", filtro.matricula);
  }

  if (filtro.serie) {
    consulta = consulta.where("serie", "==", filtro.serie);
  }

  const resultado = await consulta.get();

  return resultado.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as ReciboComId,
  );
}

export async function obterRecibo(id: string): Promise<ReciboComId | null> {
  const doc = await getAdminDb().collection(COLECOES.recibos).doc(id).get();

  return doc.exists ? ({ id: doc.id, ...doc.data() } as ReciboComId) : null;
}

export async function listarSeries(): Promise<SerieDeRecibos[]> {
  const resultado = await getAdminDb()
    .collection(COLECOES.seriesDeRecibo)
    .orderBy("serie")
    .get();

  return resultado.docs.map((doc) => doc.data() as SerieDeRecibos);
}

/** Só as séries abertas aparecem na emissão. */
export async function seriesAbertas(): Promise<SerieDeRecibos[]> {
  return (await listarSeries()).filter((serie) => serie.ativa);
}

/**
 * O recibo é lido sem recorte de aluno, mas a sessão é exigida pela rota.
 * Fica explícito aqui para o dia em que a família passar a ver os próprios
 * recibos: é esta função que ganha o escopo.
 */
export function podeVerRecibo(sessao: SessionUser): boolean {
  return sessao.role !== "aluno" && sessao.role !== "responsavel";
}
