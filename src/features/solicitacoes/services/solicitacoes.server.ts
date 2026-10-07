import "server-only";

import { administraEscola } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Solicitacao } from "@/core/modelo";
import { ordenarFila } from "@/features/solicitacoes/domain/fila";

/**
 * Leitura dos pedidos.
 *
 * O escopo é aplicado aqui porque o Admin SDK ignora as Security Rules: a
 * família enxerga os pedidos dos filhos vinculados, a escola enxerga a fila
 * inteira.
 */

export interface SolicitacaoComId extends Solicitacao {
  id: string;
}

const paraLista = (docs: FirebaseFirestore.QuerySnapshot): SolicitacaoComId[] =>
  ordenarFila(
    docs.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Solicitacao) })),
  );

/** A fila inteira — visão da secretaria e da coordenação. */
export async function listarFila(): Promise<SolicitacaoComId[]> {
  return paraLista(await getAdminDb().collection(COLECOES.solicitacoes).get());
}

/**
 * Os pedidos dos filhos de quem está pedindo.
 *
 * A consulta é por `matricula`, e não por `solicitanteUid`: quando dois
 * responsáveis acompanham o mesmo aluno, os dois precisam ver o pedido que
 * qualquer um deles abriu — senão um liga para a secretaria perguntar por um
 * documento que o outro já pediu.
 */
export async function listarDaFamilia(
  sessao: SessionUser,
): Promise<SolicitacaoComId[]> {
  const matriculas = sessao.alunosVinculados;
  if (matriculas.length === 0) return [];

  // O `in` do Firestore aceita 30 valores; nenhuma família chega perto, e o
  // corte evita a consulta falhar em silêncio se um dia chegar.
  const docs = await getAdminDb()
    .collection(COLECOES.solicitacoes)
    .where("matricula", "in", matriculas.slice(0, 30))
    .get();

  return paraLista(docs);
}

/**
 * Um pedido, se quem pede tem direito de vê-lo.
 *
 * `null` tanto para "não existe" quanto para "não é seu" — quem chama
 * responde 404 nos dois casos.
 */
export async function obterSolicitacaoVisivel(
  sessao: SessionUser,
  id: string,
): Promise<SolicitacaoComId | null> {
  const doc = await getAdminDb()
    .collection(COLECOES.solicitacoes)
    .doc(id)
    .get();

  if (!doc.exists) return null;

  const solicitacao = { id: doc.id, ...(doc.data() as Solicitacao) };

  if (administraEscola(sessao.role)) return solicitacao;

  return sessao.alunosVinculados.includes(solicitacao.matricula)
    ? solicitacao
    : null;
}
