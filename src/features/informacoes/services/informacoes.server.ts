import "server-only";

import { COLECOES, type Informacao } from "@/core/modelo";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import { isEquipe } from "@/core/auth/roles";
import {
  avisoEhPara,
  chavesDoDestinatario,
  lotesDeChaves,
} from "@/features/avisos/domain/destinatarios";
import { contextoDaSessao } from "@/features/avisos/services/avisos.server";
import { ordenarCards } from "@/features/informacoes/domain/ordem";

/**
 * Leitura das informações úteis.
 *
 * O alcance é o mesmo dos avisos, e a consulta também: `where("chave", "in",
 * ...)` com as chaves da pessoa. Reaproveitar `contextoDaSessao` mantém uma
 * decisão só sobre quem alcança quem.
 */

export interface InformacaoComId extends Informacao {
  id: string;
}

/** Os cards que alcançam a pessoa, na ordem em que devem aparecer. */
export async function listarInformacoesPara(
  sessao: SessionUser,
): Promise<InformacaoComId[]> {
  const contexto = await contextoDaSessao(sessao);
  const db = getAdminDb();

  const consultas = lotesDeChaves(chavesDoDestinatario(contexto)).map((lote) =>
    db
      .collection(COLECOES.informacoes)
      .where("ativo", "==", true)
      .where("chave", "in", lote)
      .get(),
  );

  const resultados = await Promise.all(consultas);

  // O `in` vem em lotes, e um card pode cair em mais de um: o mapa por id
  // evita mostrar duas vezes.
  const cards = new Map<string, InformacaoComId>();
  for (const resultado of resultados) {
    for (const doc of resultado.docs) {
      cards.set(doc.id, { id: doc.id, ...(doc.data() as Informacao) });
    }
  }

  return ordenarCards([...cards.values()]);
}

/** Tudo que foi publicado — visão da equipe escolar. */
export async function listarInformacoesPublicadas(): Promise<
  InformacaoComId[]
> {
  const docs = await getAdminDb().collection(COLECOES.informacoes).get();

  return ordenarCards(
    docs.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Informacao) })),
  );
}

export async function obterInformacao(
  id: string,
): Promise<InformacaoComId | null> {
  const doc = await getAdminDb().collection(COLECOES.informacoes).doc(id).get();

  return doc.exists ? { id: doc.id, ...(doc.data() as Informacao) } : null;
}

/**
 * O card, se ele alcança quem está pedindo.
 *
 * `null` tanto para "não existe" quanto para "não é para você" — quem chama
 * responde 404 nos dois casos. Um 403 confirmaria que a tutoria daquele
 * aluno existe, que é justamente o que não se deve contar.
 */
export async function obterInformacaoVisivel(
  sessao: SessionUser,
  id: string,
): Promise<InformacaoComId | null> {
  const informacao = await obterInformacao(id);
  if (!informacao) return null;

  if (isEquipe(sessao.role)) return informacao;
  if (!informacao.ativo) return null;

  const contexto = await contextoDaSessao(sessao);
  return avisoEhPara(informacao.chave, contexto) ? informacao : null;
}
