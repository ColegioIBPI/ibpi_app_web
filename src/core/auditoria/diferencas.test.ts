import { describe, expect, it } from "vitest";

import {
  calcularAlteracoes,
  houveAlteracao,
  semCamposTecnicos,
} from "@/core/auditoria/diferencas";

describe("calcularAlteracoes", () => {
  it("registra só o campo que mudou", () => {
    const alteracoes = calcularAlteracoes(
      { nome: "Alice", turmaCodigo: "EM1A" },
      { nome: "Alice Vianna", turmaCodigo: "EM1A" },
    );

    expect(alteracoes).toEqual({
      nome: { de: "Alice", para: "Alice Vianna" },
    });
  });

  it("devolve vazio quando nada mudou", () => {
    const iguais = { nome: "Alice", ativo: true };
    expect(calcularAlteracoes(iguais, { ...iguais })).toEqual({});
    expect(houveAlteracao({})).toBe(false);
  });

  it("desce em objeto aninhado, com caminho de ponto", () => {
    const alteracoes = calcularAlteracoes(
      { contato: { endereco: { cidade: "Rio de Janeiro", uf: "RJ" } } },
      { contato: { endereco: { cidade: "Niterói", uf: "RJ" } } },
    );

    expect(alteracoes).toEqual({
      "contato.endereco.cidade": { de: "Rio de Janeiro", para: "Niterói" },
    });
  });

  it("registra campo que passou a existir", () => {
    expect(calcularAlteracoes({}, { cpf: "01719425078" })).toEqual({
      cpf: { de: null, para: "01719425078" },
    });
  });

  it("registra campo que foi apagado", () => {
    expect(calcularAlteracoes({ cpf: "01719425078" }, { cpf: null })).toEqual({
      cpf: { de: "01719425078", para: null },
    });
  });

  it("não confunde ausente, null e vazio entre si", () => {
    // O Firestore devolve `undefined` para campo que nunca existiu e o
    // formulário manda `null` para campo apagado. Não é mudança de verdade.
    expect(calcularAlteracoes({ obs: undefined }, { obs: null })).toEqual({});
    expect(calcularAlteracoes({ obs: null }, { obs: "" })).toEqual({});
    expect(calcularAlteracoes({}, { obs: null })).toEqual({});
  });

  it("compara lista pelo conteúdo e pela ordem", () => {
    expect(
      calcularAlteracoes(
        { emails: ["a@x.com", "b@x.com"] },
        { emails: ["a@x.com", "b@x.com"] },
      ),
    ).toEqual({});

    expect(
      calcularAlteracoes({ emails: ["a@x.com"] }, { emails: ["b@x.com"] }),
    ).toEqual({
      emails: { de: ["a@x.com"], para: ["b@x.com"] },
    });

    expect(calcularAlteracoes({ emails: ["a@x.com"] }, { emails: [] })).toEqual(
      { emails: { de: ["a@x.com"], para: [] } },
    );
  });

  it("detecta mudança de tipo, não só de valor", () => {
    expect(calcularAlteracoes({ ativo: true }, { ativo: false })).toEqual({
      ativo: { de: true, para: false },
    });
  });

  it("registra várias mudanças de uma vez", () => {
    const alteracoes = calcularAlteracoes(
      { nome: "Alice", contato: { endereco: { cidade: "Rio" } }, ativo: true },
      {
        nome: "Alice V.",
        contato: { endereco: { cidade: "Niterói" } },
        ativo: false,
      },
    );

    expect(Object.keys(alteracoes).sort()).toEqual([
      "ativo",
      "contato.endereco.cidade",
      "nome",
    ]);
  });
});

describe("semCamposTecnicos", () => {
  it("descarta o que o próprio sistema escreve", () => {
    // Sem isto, toda edição registraria "atualizadoEm mudou" — ruído que
    // esconde a mudança real.
    const alteracoes = calcularAlteracoes(
      { nome: "Alice", atualizadoEm: "2026-09-22", nomeParaBusca: "ALICE" },
      {
        nome: "Alice V.",
        atualizadoEm: "2026-09-23",
        nomeParaBusca: "ALICE V",
      },
    );

    expect(semCamposTecnicos(alteracoes)).toEqual({
      nome: { de: "Alice", para: "Alice V." },
    });
  });

  it("descarta campo técnico aninhado também", () => {
    const alteracoes = { "contato.origem": { de: "access", para: "portal" } };
    expect(semCamposTecnicos(alteracoes)).toEqual({});
  });

  it("não descarta campo de negócio com nome parecido", () => {
    const alteracoes = { dataMatricula: { de: null, para: "2026-01-10" } };
    expect(semCamposTecnicos(alteracoes)).toEqual(alteracoes);
  });
});
