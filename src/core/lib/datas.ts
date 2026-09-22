/**
 * Conversão de data.
 *
 * O construtor do JavaScript interpreta `"2026-03-27"` como **meia-noite em
 * UTC**, o que no fuso de São Paulo ainda é dia 26. Isso já quebrou o
 * boletim (falta exibida no dia anterior) e o financeiro (parcela paga no
 * dia do vencimento aparecendo vencida).
 *
 * A regra do sistema: data sem hora é sempre **meio-dia local**. Assim ela
 * não atravessa a virada do dia em nenhum fuso do Brasil.
 */
export function paraData(valor: Date | string | number): Date {
  if (valor instanceof Date) return valor;
  if (typeof valor === "number") return new Date(valor);

  const soData = /^\d{4}-\d{2}-\d{2}$/.test(valor);

  return new Date(soData ? `${valor}T12:00:00` : valor);
}

/** Último instante do dia da data informada, no fuso local. */
export function fimDoDia(valor: Date | string | number): Date {
  const data = paraData(valor);
  const limite = new Date(data);
  limite.setHours(23, 59, 59, 999);

  return limite;
}

/** `Date` → `"2026-03-27"`, no fuso local (não em UTC). */
export function paraDataISO(valor: Date | string | number): string {
  const data = paraData(valor);
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${data.getFullYear()}-${mes}-${dia}`;
}
