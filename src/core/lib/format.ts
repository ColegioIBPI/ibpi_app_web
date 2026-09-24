/**
 * Formatação padronizada em pt-BR.
 *
 * Tudo que aparece para o usuário passa por aqui: data, moeda e nota. Cada
 * tela formatando do seu jeito é como o boletim atual acaba com 8,48 numa
 * coluna e 8.477777778 na outra.
 */

import { paraData } from "@/core/lib/datas";

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
  return dateFormatter.format(paraData(value));
}

/** `2026-03-27` → `27/03` — usado nas grades de aula, onde o ano é redundante */
export function formatShortDate(value: Date | string): string {
  return shortDateFormatter.format(paraData(value));
}

/**
 * Nota com **duas** casas e vírgula: `8.477777` → `8,48`.
 *
 * Duas, e não uma, porque é o que o boletim do colégio mostra: lá, Projeto
 * 7,83 + Tarefas 10,00 + AV 7,60 fecham em 8,48.
 */
export function formatGrade(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** `0.7` → `70%` */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
