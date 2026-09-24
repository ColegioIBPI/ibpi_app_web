import { paraDataISO } from "@/core/lib/datas";
import type { Cobranca, SituacaoDaCobranca } from "@/core/modelo";

/**
 * Situação e totais de cobrança.
 *
 * A regra central: **"vencida" é uma conclusão sobre hoje, não um dado.**
 * Uma parcela gravada como "em aberto" em abril continua gravada assim em
 * dezembro, muito depois de vencer. Por isso a situação é sempre calculada
 * na leitura, a partir do vencimento e do pagamento — que são os fatos.
 *
 * Nenhum dinheiro passa pelo sistema: isto é controle interno (README,
 * seção 5.7).
 */

/** O que basta para decidir a situação de uma parcela. */
export interface DadosDaSituacao {
  vencimento: string;
  dataPagamento?: string | null;
}

export function situacaoDaCobranca(
  { vencimento, dataPagamento }: DadosDaSituacao,
  hoje: Date | string = new Date(),
): SituacaoDaCobranca {
  // O pagamento é o fato que encerra a parcela. Pago depois do vencimento
  // continua pago — atraso quitado não é inadimplência.
  if (dataPagamento) return "paga";

  return vencimento < paraDataISO(hoje) ? "vencida" : "aberta";
}

/**
 * Dias de atraso de uma parcela vencida.
 *
 * `0` para o que está em dia ou já pago — é o número que a secretaria usa
 * para priorizar a cobrança.
 */
export function diasDeAtraso(
  cobranca: DadosDaSituacao,
  hoje: Date | string = new Date(),
): number {
  if (situacaoDaCobranca(cobranca, hoje) !== "vencida") return 0;

  const MS_POR_DIA = 86_400_000;
  const vencimento = Date.parse(`${cobranca.vencimento}T12:00:00`);
  const referencia = Date.parse(`${paraDataISO(hoje)}T12:00:00`);

  return Math.max(0, Math.round((referencia - vencimento) / MS_POR_DIA));
}

/**
 * Quanto ainda falta pagar nesta parcela.
 *
 * O Access gravou `0` para quem não pagou, então "valor pago zero" e "não
 * pagou" são a mesma coisa aqui. Pagamento parcial existe e aparece como
 * saldo positivo mesmo com a parcela marcada como paga — quem confere o
 * extrato precisa ver a diferença.
 */
export function saldo(cobranca: Pick<Cobranca, "valor" | "valorPago">): number {
  return arredondarReais((cobranca.valor ?? 0) - (cobranca.valorPago ?? 0));
}

/** Parcela quitada com valor menor que o devido. */
export function pagaParcialmente(
  cobranca: Pick<Cobranca, "valor" | "valorPago" | "dataPagamento">,
): boolean {
  return Boolean(cobranca.dataPagamento) && saldo(cobranca) > 0;
}

export interface Totais {
  /** Quantas parcelas entraram na conta. */
  parcelas: number;
  contratado: number;
  pago: number;
  emAberto: number;
  vencido: number;
}

/**
 * Totais do extrato.
 *
 * `emAberto` inclui o que está vencido: é o que a família ainda deve. O
 * `vencido` é o recorte dentro dele que já passou do prazo — separar os dois
 * em vez de somar evita a pergunta "então devo isso ou aquilo?".
 */
export function totalizar(
  cobrancas: readonly Cobranca[],
  hoje: Date | string = new Date(),
): Totais {
  const totais: Totais = {
    parcelas: cobrancas.length,
    contratado: 0,
    pago: 0,
    emAberto: 0,
    vencido: 0,
  };

  for (const cobranca of cobrancas) {
    const situacao = situacaoDaCobranca(cobranca, hoje);
    const devido = saldo(cobranca);

    totais.contratado += cobranca.valor ?? 0;
    totais.pago += cobranca.valorPago ?? 0;

    if (devido > 0) {
      totais.emAberto += devido;
      if (situacao === "vencida") totais.vencido += devido;
    }
  }

  return {
    ...totais,
    contratado: arredondarReais(totais.contratado),
    pago: arredondarReais(totais.pago),
    emAberto: arredondarReais(totais.emAberto),
    vencido: arredondarReais(totais.vencido),
  };
}

/** Vencimento crescente — a ordem do extrato e do carnê. */
export function ordenarPorVencimento(cobrancas: readonly Cobranca[]): Cobranca[] {
  return [...cobrancas].sort(
    (a, b) =>
      a.vencimento.localeCompare(b.vencimento) ||
      (a.parcela ?? 0) - (b.parcela ?? 0),
  );
}

export interface FiltroDeCobrancas {
  situacao?: SituacaoDaCobranca | "todas";
  /** Período por vencimento, inclusive nas duas pontas. */
  de?: string;
  ate?: string;
}

export function filtrarCobrancas(
  cobrancas: readonly Cobranca[],
  filtro: FiltroDeCobrancas = {},
  hoje: Date | string = new Date(),
): Cobranca[] {
  return cobrancas.filter((cobranca) => {
    if (filtro.de && cobranca.vencimento < filtro.de) return false;
    if (filtro.ate && cobranca.vencimento > filtro.ate) return false;

    if (filtro.situacao && filtro.situacao !== "todas") {
      return situacaoDaCobranca(cobranca, hoje) === filtro.situacao;
    }

    return true;
  });
}

/**
 * Centavos são a unidade do dinheiro.
 *
 * Somar reais em ponto flutuante acumula erro (`0.1 + 0.2`), e um extrato
 * que fecha em R$ 1.999,9999999 é um extrato que a secretaria não confia.
 */
export function arredondarReais(valor: number): number {
  return Math.round(valor * 100) / 100;
}
