import { describe, expect, it } from "vitest";

import {
  abaixoDaFrequencia,
  comPendencia,
  ehDiaLetivo,
  plural,
  semTrimestreLiberado,
  turmasSemChamada,
  turmasSemGrade,
  type Pendencia,
} from "@/features/painel/domain/pendencias";

const pendencia = (chave: string, valor: string): Pendencia => ({
  chave,
  titulo: chave,
  valor,
  detalhe: "",
  href: "/",
  gravidade: "media",
});

describe("o que entra no painel", () => {
  it("pendência zerada não vira cartão", () => {
    // Painel cheio de zero ensina a ignorar painel.
    expect(
      comPendencia([
        pendencia("a", "0"),
        pendencia("b", "3"),
        pendencia("c", "0"),
      ]).map((p) => p.chave),
    ).toEqual(["b"]);
  });

  it("valor que não é contagem passa", () => {
    // "R$ 12.400,00" não é zero, mesmo não sendo número.
    expect(comPendencia([pendencia("a", "R$ 12.400,00")])).toHaveLength(1);
  });
});

describe("dia letivo", () => {
  it("fim de semana não tem chamada", () => {
    // Sem isto o painel cobraria dez turmas todo sábado, e na segunda
    // ninguém mais olharia o cartão.
    expect(ehDiaLetivo(new Date("2026-10-16T12:00:00"))).toBe(true); // sexta
    expect(ehDiaLetivo(new Date("2026-10-17T12:00:00"))).toBe(false); // sábado
    expect(ehDiaLetivo(new Date("2026-10-18T12:00:00"))).toBe(false); // domingo
    expect(ehDiaLetivo(new Date("2026-10-19T12:00:00"))).toBe(true); // segunda
  });
});

describe("chamada do dia", () => {
  const turmas = [
    { id: "2026-EM1A", codigo: "EM1A" },
    { id: "2026-EM2A", codigo: "EM2A" },
  ];

  it("lista só as turmas sem nenhum lançamento", () => {
    expect(
      turmasSemChamada(turmas, new Set(["2026-EM1A"])).map((t) => t.codigo),
    ).toEqual(["EM2A"]);
  });

  it("dia inteiro lançado não deixa pendência", () => {
    expect(
      turmasSemChamada(turmas, new Set(["2026-EM1A", "2026-EM2A"])),
    ).toEqual([]);
  });
});

describe("frequência abaixo do mínimo", () => {
  const alunos = [
    { matricula: "1", nome: "Alice", percentual: 0.95 },
    { matricula: "2", nome: "Bruno", percentual: 0.6 },
    { matricula: "3", nome: "Carla", percentual: 0.74 },
    { matricula: "4", nome: "Davi", percentual: null },
  ];

  it("traz quem está abaixo de 75%", () => {
    expect(abaixoDaFrequencia(alunos).map((a) => a.nome)).toEqual([
      "Bruno",
      "Carla",
    ]);
  });

  it("do pior para o melhor — é a ordem de quem vai ligar", () => {
    expect(abaixoDaFrequencia(alunos)[0].nome).toBe("Bruno");
  });

  it("aluno sem registro nenhum fica de fora", () => {
    // `null` não é zero por cento: é "ainda não há o que calcular".
    expect(abaixoDaFrequencia(alunos).some((a) => a.nome === "Davi")).toBe(
      false,
    );
  });

  it("exatamente 75% está dentro", () => {
    expect(
      abaixoDaFrequencia([{ matricula: "1", nome: "X", percentual: 0.75 }]),
    ).toEqual([]);
  });
});

describe("turma sem grade", () => {
  it("acha a turma sem nenhuma disciplina vinculada", () => {
    expect(
      turmasSemGrade([
        { id: "a", codigo: "EM1A", disciplinas: 11 },
        { id: "b", codigo: "EF6A", disciplinas: 0 },
      ]).map((t) => t.codigo),
    ).toEqual(["EF6A"]);
  });
});

describe("trimestre não liberado", () => {
  const boletins = [
    { matricula: "1", liberados: ["1", "2"] },
    { matricula: "2", liberados: ["1"] },
    { matricula: "3", liberados: [] },
  ];

  it("lista quem ainda não teve o trimestre liberado", () => {
    expect(semTrimestreLiberado(boletins, "2").map((b) => b.matricula)).toEqual(
      ["2", "3"],
    );
  });

  it("turma inteira liberada não deixa pendência", () => {
    expect(semTrimestreLiberado(boletins, "1").map((b) => b.matricula)).toEqual(
      ["3"],
    );
  });
});

describe("plural", () => {
  it("escolhe a palavra certa", () => {
    expect(plural(1, "aluno", "alunos")).toBe("aluno");
    expect(plural(0, "aluno", "alunos")).toBe("alunos");
    expect(plural(5, "aluno", "alunos")).toBe("alunos");
  });
});
