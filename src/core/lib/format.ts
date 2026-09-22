/**
 * Formatação padronizada em pt-BR.
 *
 * Tudo que aparece para o usuário passa por aqui: data, moeda e nota. Cada
 * tela formatando do seu jeito é como o boletim atual acaba com 8,48 numa
 * coluna e 8.477777778 na outra.
 */

const LOCALE = "pt-BR";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** `1234.5` → `R$ 1.234,50` */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** `2026-03-27` → `27/03/2026` */
export function formatDate(value: Date | string): string {
  return dateFormatter.format(toDate(value));
}

/** `2026-03-27` → `27/03` — usado nas grades de aula, onde o ano é redundante */
export function formatShortDate(value: Date | string): string {
  return shortDateFormatter.format(toDate(value));
}

/**
 * Nota sempre com uma casa decimal e vírgula: `8.477777` → `8,5`.
 * O arredondamento é só de exibição — o valor cheio continua no banco, porque
 * a média anual precisa ser calculada sobre os valores originais.
 */
export function formatGrade(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** `0.7` → `70%` */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  // Data pura (`2026-03-27`) é interpretada como UTC pelo construtor, o que
  // joga o dia para trás no fuso de São Paulo. Fixar meio-dia evita isso.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Date(isDateOnly ? `${value}T12:00:00` : value);
}
