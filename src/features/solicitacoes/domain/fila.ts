import type { SituacaoDaSolicitacao } from "@/core/modelo";

/**
 * A fila de atendimento: para onde um pedido pode ir, e quem pode levá-lo.
 *
 * Função pura, longe do banco, porque é a regra que a secretaria e a
 * família enxergam de formas diferentes — e a única forma de garantir que
 * as duas telas concordem é as duas perguntarem aqui.
 */

/** Quem está mexendo no pedido. */
export type QuemMove = "familia" | "escola";

/**
 * Transições permitidas, por quem move.
 *
 * O desenho tem duas intenções:
 *
 * - **A escola nunca volta atrás sozinha.** De `entregue` não se sai: o
 *   documento saiu da mão dela. Corrigir um engano é abrir outro pedido,
 *   que deixa rastro, em vez de reescrever a história deste.
 * - **A família só cancela o que ninguém pegou.** Depois de `em-andamento`
 *   alguém já gastou trabalho, e sumir com o pedido faria esse trabalho
 *   desaparecer da fila sem explicação.
 */
const TRANSICOES: Record<
  QuemMove,
  Partial<Record<SituacaoDaSolicitacao, SituacaoDaSolicitacao[]>>
> = {
  escola: {
    aberta: ["em-andamento", "pronta", "recusada"],
    "em-andamento": ["pronta", "recusada"],
    pronta: ["entregue", "em-andamento"],
  },
  familia: {
    aberta: ["cancelada"],
  },
};

/** As situações finais: de nenhuma delas se sai. */
export const ENCERRADAS: SituacaoDaSolicitacao[] = [
  "entregue",
  "recusada",
  "cancelada",
];

export function estaEncerrada(situacao: SituacaoDaSolicitacao): boolean {
  return ENCERRADAS.includes(situacao);
}

/** Para onde este pedido pode ir, nas mãos de quem está pedindo. */
export function proximasSituacoes(
  atual: SituacaoDaSolicitacao,
  quem: QuemMove,
): SituacaoDaSolicitacao[] {
  return TRANSICOES[quem][atual] ?? [];
}

export function podeMover(
  de: SituacaoDaSolicitacao,
  para: SituacaoDaSolicitacao,
  quem: QuemMove,
): boolean {
  return proximasSituacoes(de, quem).includes(para);
}

/**
 * Recusar exige motivo.
 *
 * É a única transição que a família recebe como má notícia, e "recusada"
 * sem explicação transforma uma resposta em um enigma — que volta como
 * telefonema para a secretaria.
 */
export function exigeMotivo(para: SituacaoDaSolicitacao): boolean {
  return para === "recusada";
}

/** Pedidos em aberto primeiro, e dentro de cada grupo o mais antigo no topo. */
export function ordenarFila<
  T extends { situacao: SituacaoDaSolicitacao; abertaEm: string },
>(pedidos: readonly T[]): T[] {
  return [...pedidos].sort((a, b) => {
    const encerradaA = estaEncerrada(a.situacao) ? 1 : 0;
    const encerradaB = estaEncerrada(b.situacao) ? 1 : 0;

    // O que ainda precisa de atenção sobe; o resto é histórico.
    if (encerradaA !== encerradaB) return encerradaA - encerradaB;

    // Entre os pendentes, o mais antigo primeiro — é quem está esperando há
    // mais tempo. Entre os encerrados, o mais recente, que é o que alguém
    // volta para conferir.
    return encerradaA === 1
      ? b.abertaEm.localeCompare(a.abertaEm)
      : a.abertaEm.localeCompare(b.abertaEm);
  });
}
