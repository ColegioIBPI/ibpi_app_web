import { describe, expect, it } from "vitest";

import {
  anoLetivoAtual,
  trimestreDaQuery,
  trimestreSugerido,
} from "@/core/lib/ano-letivo";

describe("trimestreSugerido", () => {
  it("segue a divisão aproximada do ano letivo", () => {
    expect(trimestreSugerido("2026-02-10")).toBe(1);
    expect(trimestreSugerido("2026-05-31")).toBe(1);
    expect(trimestreSugerido("2026-06-01")).toBe(2);
    expect(trimestreSugerido("2026-08-31")).toBe(2);
    expect(trimestreSugerido("2026-09-01")).toBe(3);
    expect(trimestreSugerido("2026-12-20")).toBe(3);
  });

  it("não devolve valor fora dos três trimestres", () => {
    // Janeiro cai no 1º: é só o valor inicial de um seletor.
    expect([1, 2, 3]).toContain(trimestreSugerido("2026-01-15"));
  });
});

describe("anoLetivoAtual", () => {
  it("é o ano corrente durante o período letivo", () => {
    expect(anoLetivoAtual("2026-03-27")).toBe(2026);
  });

  it("em janeiro ainda é o ano anterior", () => {
    // Férias: quem abre o sistema em janeiro está fechando o ano passado.
    expect(anoLetivoAtual("2027-01-10")).toBe(2026);
  });
});

describe("trimestreDaQuery", () => {
  it("aceita os três trimestres", () => {
    expect(trimestreDaQuery("2")).toBe(2);
    expect(trimestreDaQuery("3")).toBe(3);
  });

  it("cai no padrão quando o valor não serve", () => {
    expect(trimestreDaQuery(undefined, 1)).toBe(1);
    expect(trimestreDaQuery("4", 2)).toBe(2);
    expect(trimestreDaQuery("banana", 3)).toBe(3);
    expect(trimestreDaQuery(["1", "2"], 1)).toBe(1);
  });
});
