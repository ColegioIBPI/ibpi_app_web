import { describe, expect, it } from "vitest";

import {
  chaveDeComparacao,
  extrairEmail,
  extrairEmails,
  limparTexto,
  normalizarCpf,
  normalizarNome,
  normalizarTelefone,
} from "@/features/migracao/domain/texto";

describe("limparTexto", () => {
  it("colapsa espaço e apara as pontas", () => {
    expect(limparTexto("  Maria   da   Silva ")).toBe("Maria da Silva");
  });

  it("trata as marcas de campo vazio usadas na digitação", () => {
    // Casos reais da base: a secretaria preenchia assim para dizer
    // "não tem segundo responsável".
    expect(limparTexto("////////////////////////")).toBeNull();
    expect(limparTexto("---")).toBeNull();
    expect(limparTexto("...")).toBeNull();
    expect(limparTexto("xxx")).toBeNull();
    expect(limparTexto("   ")).toBeNull();
    expect(limparTexto("")).toBeNull();
  });

  it("aceita número, porque o Access guarda matrícula assim", () => {
    // A coluna Matricula é numérica na origem. Recusá-la descartaria o
    // aluno inteiro por causa do tipo da coluna.
    expect(limparTexto(22022)).toBe("22022");
    expect(limparTexto(0)).toBe("0");
  });

  it("devolve null para o que não é texto nem número", () => {
    expect(limparTexto(null)).toBeNull();
    expect(limparTexto(undefined)).toBeNull();
    expect(limparTexto(Number.NaN)).toBeNull();
    expect(limparTexto({})).toBeNull();
  });

  it("não confunde texto curto legítimo com placeholder", () => {
    expect(limparTexto("Ana")).toBe("Ana");
    expect(limparTexto("6/7")).toBe("6/7");
  });
});

describe("chaveDeComparacao", () => {
  it("ignora acento, caixa e pontuação", () => {
    expect(chaveDeComparacao("Cauã Cananéa Ramos")).toBe("CAUA CANANEA RAMOS");
    expect(chaveDeComparacao("ANDRE LUIZ CELANO DE MELLO V.")).toBe(
      "ANDRE LUIZ CELANO DE MELLO V",
    );
  });

  it("faz duas grafias da mesma pessoa baterem", () => {
    expect(chaveDeComparacao("João  Miguel da Silva")).toBe(
      chaveDeComparacao("JOAO MIGUEL DA SILVA"),
    );
  });

  it("devolve string vazia para campo sem conteúdo", () => {
    expect(chaveDeComparacao("////")).toBe("");
    expect(chaveDeComparacao(null)).toBe("");
  });
});

describe("extrairEmails", () => {
  it("tira a anotação que veio colada no e-mail", () => {
    expect(extrairEmail("regobato@gmail.com ( Mãe")).toBe("regobato@gmail.com");
  });

  it("aceita o campo com dois e-mails", () => {
    expect(extrairEmails("a@x.com.br; b@y.org (pai)")).toEqual([
      "a@x.com.br",
      "b@y.org",
    ]);
  });

  it("normaliza para minúsculas e remove repetição", () => {
    expect(extrairEmails("Fulano@Gmail.com, fulano@gmail.com")).toEqual([
      "fulano@gmail.com",
    ]);
  });

  it("devolve vazio quando não há e-mail", () => {
    expect(extrairEmails("não tem")).toEqual([]);
    expect(extrairEmails("////")).toEqual([]);
    expect(extrairEmail(null)).toBeNull();
  });
});

describe("normalizarTelefone", () => {
  it("converte o formato da base para E.164", () => {
    expect(normalizarTelefone("(61)99976-0810")).toBe("+5561999760810");
    expect(normalizarTelefone("(21) 3333-4444")).toBe("+552133334444");
  });

  it("aceita número que já vem com o código do país", () => {
    expect(normalizarTelefone("+55 21 99663-1409")).toBe("+5521996631409");
  });

  it("recusa número incompleto em vez de inventar DDD", () => {
    expect(normalizarTelefone("99976-0810")).toBeNull();
    expect(normalizarTelefone("1234")).toBeNull();
    expect(normalizarTelefone("////")).toBeNull();
  });
});

describe("normalizarCpf", () => {
  it("mantém só os dígitos", () => {
    expect(normalizarCpf("017.194.250-78")).toBe("01719425078");
  });

  it("recompõe o zero à esquerda que o Access comeu", () => {
    // O campo é numérico na origem, então 00135827710 chega como 135827710.
    expect(normalizarCpf("135827710")).toBe("00135827710");
  });

  it("recusa o que não tem 11 dígitos", () => {
    expect(normalizarCpf("123456789012345")).toBeNull();
    expect(normalizarCpf("////")).toBeNull();
  });
});

describe("normalizarNome", () => {
  it("arruma a capitalização preservando as partículas", () => {
    expect(normalizarNome("MARIA DA SILVA DOS SANTOS")).toBe(
      "Maria da Silva dos Santos",
    );
  });

  it("mantém a partícula maiúscula quando abre o nome", () => {
    expect(normalizarNome("DA SILVA")).toBe("Da Silva");
  });

  it("preserva acento", () => {
    expect(normalizarNome("CAUÃ CANANÉA")).toBe("Cauã Cananéa");
  });

  it("devolve null para campo vazio", () => {
    expect(normalizarNome("////")).toBeNull();
  });
});
