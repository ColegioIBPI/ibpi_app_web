import "server-only";

import { COLECOES } from "@/core/modelo";
import type { SessionUser } from "@/core/auth/session";
import { getAdminDb } from "@/core/firebase/admin";
import {
  calcularAlteracoes,
  houveAlteracao,
  semCamposTecnicos,
  type Alteracoes,
} from "@/core/auditoria/diferencas";

/**
 * Gravação da trilha de auditoria.
 *
 * Obrigatória em nota, frequência e financeiro (README, seção 6.3) e usada
 * também no cadastro. É o que permite ao colégio responder quando uma
 * família contesta uma alteração.
 *
 * A gravação acontece **no mesmo lote** da alteração: ou os dois entram, ou
 * nenhum. Auditoria que pode falhar sozinha é auditoria com buraco.
 */

interface RegistroDeAlteracao {
  colecao: string;
  documentoId: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown>;
  autor: SessionUser;
}

/**
 * Grava o documento e a auditoria atomicamente.
 *
 * Devolve as alterações registradas — vazio quando nada mudou, caso em que
 * nem o documento nem a auditoria são tocados.
 */
export async function gravarComAuditoria({
  colecao,
  documentoId,
  antes,
  depois,
  autor,
}: RegistroDeAlteracao): Promise<Alteracoes> {
  // A gravação é com `merge`: campo ausente em `depois` não é apagado, só
  // fica como está. Então o diff precisa olhar apenas o que está sendo
  // gravado — comparar o documento inteiro faria a auditoria registrar
  // remoções que nunca aconteceram, e todo "salvar" viraria uma alteração.
  const alteracoes = semCamposTecnicos(
    calcularAlteracoes(recortar(antes ?? {}, depois), depois),
  );

  // Salvar sem mudar nada não vira registro: a trilha ficaria cheia de
  // "abriu e fechou o formulário", escondendo as edições de verdade.
  if (!houveAlteracao(alteracoes)) return {};

  const db = getAdminDb();
  const lote = db.batch();
  const agora = new Date().toISOString();

  lote.set(
    db.collection(colecao).doc(documentoId),
    { ...depois, atualizadoEm: agora, atualizadoPor: autor.uid },
    { merge: true },
  );

  lote.set(
    db.collection(COLECOES.auditoria).doc(),
    corpoDaAuditoria({
      colecao,
      documentoId,
      acao: antes ? "alterou" : "criou",
      alteracoes,
      autor,
      em: agora,
    }),
  );

  await lote.commit();

  return alteracoes;
}

/**
 * O registro de auditoria em si.
 *
 * Exportado porque nem toda gravação cabe num lote: a emissão de recibo
 * acontece numa **transação**, para o contador do talão não entregar o
 * mesmo número a duas pessoas. Montar o registro lá dentro à mão criaria
 * uma segunda descrição do formato, e as duas envelheceriam separadas.
 */
export function corpoDaAuditoria({
  colecao,
  documentoId,
  acao,
  alteracoes,
  autor,
  em,
}: {
  colecao: string;
  documentoId: string;
  acao: "criou" | "alterou" | "removeu";
  alteracoes: Alteracoes;
  autor: SessionUser;
  em: string;
}) {
  return {
    colecao,
    documentoId,
    acao,
    alteracoes,
    autorUid: autor.uid,
    autorNome: autor.nome,
    autorPerfil: autor.role,
    em,
  };
}

/** Mantém de `origem` só as chaves que `modelo` também tem, recursivamente. */
function recortar(
  origem: Record<string, unknown>,
  modelo: Record<string, unknown>,
): Record<string, unknown> {
  const recorte: Record<string, unknown> = {};

  for (const chave of Object.keys(modelo)) {
    const valorOrigem = origem[chave];
    const valorModelo = modelo[chave];

    recorte[chave] =
      ehObjetoSimples(valorOrigem) && ehObjetoSimples(valorModelo)
        ? recortar(valorOrigem, valorModelo)
        : valorOrigem;
  }

  return recorte;
}

function ehObjetoSimples(valor: unknown): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor) &&
    !(valor instanceof Date)
  );
}
