import { paraData, paraDataISO } from "@/core/lib/datas";

import { arredondarReais } from "@/features/financeiro/domain/cobranca";

/**
 * Plano de pagamento: gera as parcelas de um valor contratado.
 *
 * É a conta que a secretaria faz hoje no papel antes de abrir o carnê —
 * dividir o valor, escolher o dia do vencimento e repetir mês a mês.
 */

export interface EntradaDoPlano {
  /** Valor total contratado, em reais. */
  valor: number;
  parcelas: number;
  /** Vencimento da primeira parcela (`AAAA-MM-DD`). */
  primeiroVencimento: string;
}

export interface ParcelaGerada {
  parcela: number;
  totalDeParcelas: number;
  vencimento: string;
  valor: number;
}

export interface ResultadoDoPlano {
  parcelas: ParcelaGerada[];
  erro?: string;
}

export const MAXIMO_DE_PARCELAS = 24;

export function gerarParcelas(entrada: EntradaDoPlano): ResultadoDoPlano {
  const problema = validarPlano(entrada);
  if (problema) return { parcelas: [], erro: problema };

  const { valor, parcelas: total, primeiroVencimento } = entrada;

  const centavos = Math.round(valor * 100);
  const base = Math.floor(centavos / total);
  // A sobra da divisão vai na **última** parcela: R$ 1.000 em 3 não fecha em
  // três de R$ 333,33, e deixar o centavo faltando é a diferença que a
  // secretaria descobre só no fim do ano, conferindo o total.
  const sobra = centavos - base * total;

  return {
    parcelas: Array.from({ length: total }, (_, indice) => ({
      parcela: indice + 1,
      totalDeParcelas: total,
      vencimento: somarMeses(primeiroVencimento, indice),
      valor: arredondarReais(
        (base + (indice === total - 1 ? sobra : 0)) / 100,
      ),
    })),
  };
}

function validarPlano(entrada: EntradaDoPlano): string | undefined {
  if (!Number.isFinite(entrada.valor) || entrada.valor <= 0) {
    return "Informe o valor total do plano.";
  }

  if (!Number.isInteger(entrada.parcelas) || entrada.parcelas < 1) {
    return "O plano precisa de pelo menos uma parcela.";
  }

  if (entrada.parcelas > MAXIMO_DE_PARCELAS) {
    return `O plano vai até ${MAXIMO_DE_PARCELAS} parcelas.`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(entrada.primeiroVencimento)) {
    return "Informe o vencimento da primeira parcela.";
  }

  // Em centavos, dividir R$ 0,01 em 2 parcelas deixaria uma delas zerada.
  if (Math.round(entrada.valor * 100) < entrada.parcelas) {
    return "O valor é pequeno demais para esse número de parcelas.";
  }

  return undefined;
}

/**
 * Mesmo dia nos meses seguintes.
 *
 * Dia 31 não existe em todo mês: o vencimento cai no **último dia** do mês
 * curto, e não transborda para o dia 1º do mês seguinte — que mudaria o mês
 * de competência da parcela e bagunçaria o carnê inteiro.
 */
export function somarMeses(dataISO: string, meses: number): string {
  const data = paraData(dataISO);
  const dia = data.getDate();

  const alvo = new Date(data);
  alvo.setDate(1);
  alvo.setMonth(alvo.getMonth() + meses);

  const ultimoDia = new Date(
    alvo.getFullYear(),
    alvo.getMonth() + 1,
    0,
  ).getDate();

  alvo.setDate(Math.min(dia, ultimoDia));

  return paraDataISO(alvo);
}

/** Soma das parcelas geradas — usada para conferir contra o valor contratado. */
export function somarParcelas(parcelas: readonly ParcelaGerada[]): number {
  return arredondarReais(
    parcelas.reduce((total, parcela) => total + parcela.valor, 0),
  );
}
