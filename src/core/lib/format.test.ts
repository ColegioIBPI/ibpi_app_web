import { describe, expect, it } from "vitest";

import {
  formatarTelefone,
  formatCurrency,
  formatDate,
  formatGrade,
  formatPercent,
  formatShortDate,
} from "@/core/lib/format";

describe("formatCurrency", () => {
  // O Intl separa o símbolo do valor com espaço não separável (U+00A0), para
  // que "R$" e o número nunca caiam em linhas diferentes. É o comportamento
  // correto — o teste é que precisa escrever o caractere certo.
  const NBSP = " ";

  it("formata em real com duas casas", () => {
    expect(formatCurrency(1234.5)).toBe(`R$${NBSP}1.234,50`);
  });

  it("formata zero", () => {
    expect(formatCurrency(0)).toBe(`R$${NBSP}0,00`);
  });
});

describe("formatDate", () => {
  it("formata data pura sem voltar um dia por causa do fuso", () => {
    // O bug clássico: `new Date("2026-03-27")` é meia-noite UTC, que em
    // São Paulo ainda é dia 26.
    expect(formatDate("2026-03-27")).toBe("27/03/2026");
  });

  it("aceita objeto Date", () => {
    expect(formatDate(new Date("2026-03-27T15:00:00Z"))).toBe("27/03/2026");
  });

  it("formata data curta sem o ano", () => {
    expect(formatShortDate("2026-05-11")).toBe("11/05");
  });
});

describe("formatGrade", () => {
  it("mostra duas casas com vírgula, como o boletim do colégio", () => {
    expect(formatGrade(8.48)).toBe("8,48");
    expect(formatGrade(8.477777778)).toBe("8,48");
  });

  it("mantém as casas decimais em nota inteira", () => {
    expect(formatGrade(10)).toBe("10,00");
  });

  it("mostra travessão quando não há nota lançada", () => {
    expect(formatGrade(null)).toBe("—");
    expect(formatGrade(undefined)).toBe("—");
    expect(formatGrade(Number.NaN)).toBe("—");
  });

  it("não confunde nota zero com nota ausente", () => {
    expect(formatGrade(0)).toBe("0,00");
  });
});

describe("formatPercent", () => {
  it("converte proporção em percentual inteiro", () => {
    expect(formatPercent(0.7)).toBe("70%");
    expect(formatPercent(0.756)).toBe("76%");
  });
});

describe("formatarTelefone", () => {
  it("mostra o celular brasileiro sem o código do país", () => {
    expect(formatarTelefone("+5521999998888")).toBe("(21) 99999-8888");
  });

  it("entende o fixo de oito dígitos", () => {
    expect(formatarTelefone("+552133334444")).toBe("(21) 3333-4444");
  });

  it("aceita o número sem o +55", () => {
    expect(formatarTelefone("21999998888")).toBe("(21) 99999-8888");
  });

  it("devolve como veio o que não casa com o padrão", () => {
    // Cadastro migrado tem telefone incompleto; mostrar o que está lá é
    // melhor do que esconder atrás de um traço.
    expect(formatarTelefone("99999-8888")).toBe("99999-8888");
  });

  it("vazio vira travessão, nunca 'null'", () => {
    expect(formatarTelefone(null)).toBe("—");
    expect(formatarTelefone("")).toBe("—");
  });
});
