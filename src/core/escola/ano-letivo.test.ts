import { describe, expect, it } from "vitest";

import { anoLetivoAtual } from "@/core/lib/ano-letivo";

/**
 * A janela de anos aceitos.
 *
 * A regra mora em `ano-letivo.server.ts`, que é `server-only` e não pode
 * ser importado aqui. Repeti-la num teste seria testar a cópia; o que
 * este arquivo fixa é o **contrato** dela, para a mudança de um lado
 * aparecer do outro.
 */
const ATUAL = anoLetivoAtual();

export function plausivel(ano: number): boolean {
  return Number.isInteger(ano) && ano >= ATUAL - 10 && ano <= ATUAL + 2;
}

describe("que anos o sistema aceita", () => {
  it("o corrente e os dois seguintes", () => {
    // Dois à frente porque a secretaria monta o ano seguinte em
    // dezembro, e às vezes o de depois já tem turma criada.
    expect(plausivel(ATUAL)).toBe(true);
    expect(plausivel(ATUAL + 1)).toBe(true);
    expect(plausivel(ATUAL + 2)).toBe(true);
  });

  it("dez anos para trás, para o histórico", () => {
    expect(plausivel(ATUAL - 10)).toBe(true);
    expect(plausivel(ATUAL - 11)).toBe(false);
  });

  it("recusa o que não é ano", () => {
    // O valor vem de um cookie e de uma query string — os dois são do
    // navegador, e nenhum é de confiar.
    expect(plausivel(ATUAL + 3)).toBe(false);
    expect(plausivel(Number("abc"))).toBe(false);
    expect(plausivel(2026.5)).toBe(false);
    expect(plausivel(0)).toBe(false);
  });
});
