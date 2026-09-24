import { describe, expect, it } from "vitest";

import {
  gerarParcelas,
  somarMeses,
  somarParcelas,
} from "@/features/financeiro/domain/plano";

describe("gerarParcelas", () => {
  it("divide o valor e repete o vencimento mês a mês", () => {
    const { parcelas } = gerarParcelas({
      valor: 1200,
      parcelas: 3,
      primeiroVencimento: "2026-03-05",
    });

    expect(parcelas).toEqual([
      { parcela: 1, totalDeParcelas: 3, vencimento: "2026-03-05", valor: 400 },
      { parcela: 2, totalDeParcelas: 3, vencimento: "2026-04-05", valor: 400 },
      { parcela: 3, totalDeParcelas: 3, vencimento: "2026-05-05", valor: 400 },
    ]);
  });

  it("a sobra da divisão vai na última parcela", () => {
    // R$ 1.000 em 3 não fecha em três de R$ 333,33 — o centavo que falta
    // seria descoberto só no fim do ano, conferindo o total.
    const { parcelas } = gerarParcelas({
      valor: 1000,
      parcelas: 3,
      primeiroVencimento: "2026-03-05",
    });

    expect(parcelas.map((p) => p.valor)).toEqual([333.33, 333.33, 333.34]);
    expect(somarParcelas(parcelas)).toBe(1000);
  });

  it("a soma das parcelas sempre fecha com o contratado", () => {
    for (const valor of [1923, 2940, 999.99, 1, 13140]) {
      for (const total of [1, 2, 3, 7, 12]) {
        const { parcelas } = gerarParcelas({
          valor,
          parcelas: total,
          primeiroVencimento: "2026-02-10",
        });

        expect(somarParcelas(parcelas)).toBe(valor);
      }
    }
  });

  it("parcela única é o valor inteiro", () => {
    const { parcelas } = gerarParcelas({
      valor: 2940,
      parcelas: 1,
      primeiroVencimento: "2026-02-06",
    });

    expect(parcelas).toHaveLength(1);
    expect(parcelas[0].valor).toBe(2940);
  });

  it("recusa plano sem valor", () => {
    const { erro } = gerarParcelas({
      valor: 0,
      parcelas: 3,
      primeiroVencimento: "2026-03-05",
    });

    expect(erro).toContain("valor total");
  });

  it("recusa número de parcelas inválido", () => {
    expect(
      gerarParcelas({ valor: 100, parcelas: 0, primeiroVencimento: "2026-03-05" })
        .erro,
    ).toContain("pelo menos uma");

    expect(
      gerarParcelas({ valor: 100, parcelas: 99, primeiroVencimento: "2026-03-05" })
        .erro,
    ).toContain("24 parcelas");
  });

  it("recusa valor pequeno demais para o número de parcelas", () => {
    // Dividir R$ 0,01 em duas deixaria uma parcela zerada.
    expect(
      gerarParcelas({ valor: 0.01, parcelas: 2, primeiroVencimento: "2026-03-05" })
        .erro,
    ).toContain("pequeno demais");
  });

  it("recusa vencimento mal formado", () => {
    expect(
      gerarParcelas({ valor: 100, parcelas: 2, primeiroVencimento: "05/03/2026" })
        .erro,
    ).toContain("vencimento");
  });
});

describe("somarMeses", () => {
  it("mantém o dia nos meses seguintes", () => {
    expect(somarMeses("2026-03-05", 2)).toBe("2026-05-05");
  });

  it("atravessa a virada do ano", () => {
    expect(somarMeses("2026-11-10", 3)).toBe("2027-02-10");
  });

  it("dia 31 cai no último dia do mês curto, sem transbordar", () => {
    // Transbordar para o dia 1º mudaria o mês de competência da parcela e
    // bagunçaria o carnê inteiro.
    expect(somarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(somarMeses("2026-01-31", 3)).toBe("2026-04-30");
  });

  it("volta ao dia original depois de um mês curto", () => {
    // O dia 31 de janeiro + 2 meses é 31 de março, e não 28 de março.
    expect(somarMeses("2026-01-31", 2)).toBe("2026-03-31");
  });

  it("respeita ano bissexto", () => {
    expect(somarMeses("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("zero meses devolve a mesma data", () => {
    expect(somarMeses("2026-03-05", 0)).toBe("2026-03-05");
  });
});
