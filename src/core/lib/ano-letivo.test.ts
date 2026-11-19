import { describe, expect, it } from "vitest";

import {
  anoLetivoAtual,
  anosParaOSeletor,
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

describe("anosParaOSeletor", () => {
  it("lista os anos que têm turma, do mais recente para o mais antigo", () => {
    expect(anosParaOSeletor([2024, 2026, 2025], 2026, 2026)).toEqual([
      2026, 2025, 2024,
    ]);
  });

  it("não repete um ano que já tem turma", () => {
    expect(anosParaOSeletor([2026, 2026, 2025], 2026, 2025)).toEqual([
      2026, 2025,
    ]);
  });

  it("oferece o corrente mesmo sem turma nenhuma", () => {
    // Janeiro de um ano ainda não montado: o seletor precisa ter para onde ir.
    expect(anosParaOSeletor([], 2026, 2026)).toEqual([2026]);
  });

  it("oferece o ano escolhido mesmo depois de apagarem as turmas dele", () => {
    /*
      O caso real: 2027 foi aberto, as turmas foram apagadas e o cookie
      continuou em 2027. Sem esta linha o `<select>` não acha a opção,
      mostra "2026" e carrega 2027 — e clicar em 2026 não dispara mudança
      nenhuma, então a pessoa fica presa no ano vazio.
    */
    expect(anosParaOSeletor([2026], 2026, 2027)).toEqual([2027, 2026]);
  });

  it("descarta ano implausível vindo do banco, mas nunca o escolhido", () => {
    const aceita = (ano: number) => ano >= 2016 && ano <= 2028;

    expect(anosParaOSeletor([1900, 2025], 2026, 2027, aceita)).toEqual([
      2027, 2026, 2025,
    ]);
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
