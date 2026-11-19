import { describe, expect, it } from "vitest";

import {
  formatarMatricula,
  prefixoDoAno,
  proximoSequencial,
  sequencialDaMatricula,
} from "@/features/alunos/domain/nova-matricula";

describe("o formato do colégio", () => {
  it("dois dígitos do ano e três do sequencial", () => {
    // Confirmado nos 73 cadastros migrados: 26007 é o sétimo de 2026.
    expect(formatarMatricula(2026, 7)).toBe("26007");
    expect(formatarMatricula(2027, 123)).toBe("27123");
  });

  it("lê o sequencial de volta", () => {
    expect(sequencialDaMatricula("26007", 2026)).toBe(7);
    expect(sequencialDaMatricula("26031", 2026)).toBe(31);
  });

  it("ignora o que não é do formato", () => {
    // `QA-0001` está no cadastro, e lê-lo como número queimaria a faixa
    // inteira do ano.
    expect(sequencialDaMatricula("QA-0001", 2026)).toBeNull();
    expect(sequencialDaMatricula("26007", 2027)).toBeNull();
    expect(sequencialDaMatricula("260071", 2026)).toBeNull();
    expect(sequencialDaMatricula("26", 2026)).toBeNull();
  });

  it("o prefixo é o ano em dois dígitos", () => {
    expect(prefixoDoAno(2026)).toBe("26");
  });
});

describe("o próximo número", () => {
  it("ano novo começa em 1", () => {
    expect(proximoSequencial(null, null)).toBe(1);
  });

  it("segue o contador quando ele está à frente", () => {
    // É ele que faz número usado não voltar: não recua quando um aluno
    // é excluído.
    expect(proximoSequencial(40, 31)).toBe(40);
  });

  it("a maior matrícula existente é o piso", () => {
    // O caso de 2026: 73 alunos migrados e nenhum contador. Sem o piso,
    // a primeira criação tentaria 26001 e bateria num aluno que existe.
    expect(proximoSequencial(null, 31)).toBe(32);
    expect(proximoSequencial(1, 31)).toBe(32);
  });

  it("contador atrasado não repete número", () => {
    // Contador perdido, restaurado de um backup antigo, ou aluno criado
    // fora desta tela — o piso conserta nos três.
    expect(proximoSequencial(5, 90)).toBe(91);
  });

  it("nunca devolve zero", () => {
    expect(proximoSequencial(0, null)).toBe(1);
    expect(proximoSequencial(undefined, undefined)).toBe(1);
  });
});
