import { describe, expect, it } from "vitest";

import type { Aula } from "@/core/modelo";
import {
  aulasLetivas,
  aulasSemConteudo,
  definirPresenca,
  faltasNaDisciplina,
  idDoDiario,
  ordenarAulas,
  percentualNaDisciplina,
  proximoNumero,
  resumirAulas,
  verificarDataRepetida,
} from "@/features/diario/domain/aulas";

const aula = (
  numero: number,
  data: string,
  extra: Partial<Aula> = {},
): Aula => ({
  numero,
  data,
  conteudo: extra.conteudo ?? "Conteúdo da aula",
  semAula: extra.semAula ?? null,
  presencas: extra.presencas ?? {},
});

describe("idDoDiario", () => {
  it("é um por alocação por trimestre, como a pauta impressa", () => {
    expect(idDoDiario("2026-prof1-EM1A-fisica", 2)).toBe(
      "2026-prof1-EM1A-fisica-t2",
    );
  });

  it("separa os trimestres", () => {
    expect(idDoDiario("a", 1)).not.toBe(idDoDiario("a", 2));
  });
});

describe("aulasLetivas — dia sem aula não conta", () => {
  const aulas = [
    aula(1, "2026-05-11"),
    aula(2, "2026-05-15", { semAula: "ferias" }),
    aula(3, "2026-05-18"),
    aula(4, "2026-05-22", { semAula: "ponte" }),
  ];

  it("exclui férias, recesso, ponte e feriado", () => {
    // Contá-los transformaria o recesso escolar em falta de todo mundo.
    expect(aulasLetivas(aulas)).toHaveLength(2);
    expect(aulasLetivas(aulas).map((a) => a.numero)).toEqual([1, 3]);
  });
});

describe("percentualNaDisciplina", () => {
  it("aula sem marcação conta como presença", () => {
    // O professor marca as faltas, não as presenças — exigir uma marcação
    // por aluno por aula tornaria o diário mais lento que o papel.
    const aulas = [aula(1, "2026-05-11"), aula(2, "2026-05-15")];
    expect(percentualNaDisciplina(aulas, "26007")).toBe(1);
  });

  it("calcula sobre as aulas letivas", () => {
    const aulas = [
      aula(1, "2026-05-11", { presencas: { "26007": false } }),
      aula(2, "2026-05-15"),
      aula(3, "2026-05-18"),
      aula(4, "2026-05-22"),
    ];

    expect(percentualNaDisciplina(aulas, "26007")).toBe(0.75);
  });

  it("dia sem aula não piora nem melhora a frequência", () => {
    const comRecesso = [
      aula(1, "2026-05-11", { presencas: { "26007": false } }),
      aula(2, "2026-05-15", { semAula: "recesso" }),
    ];

    // Uma falta em uma aula letiva: 0%, e não 50%.
    expect(percentualNaDisciplina(comRecesso, "26007")).toBe(0);
  });

  it("devolve null quando ainda não houve aula letiva", () => {
    expect(percentualNaDisciplina([], "26007")).toBeNull();
    expect(
      percentualNaDisciplina([aula(1, "2026-05-11", { semAula: "ferias" })], "26007"),
    ).toBeNull();
  });

  it("não confunde alunos", () => {
    const aulas = [aula(1, "2026-05-11", { presencas: { "26007": false } })];

    expect(percentualNaDisciplina(aulas, "26007")).toBe(0);
    expect(percentualNaDisciplina(aulas, "25047")).toBe(1);
  });
});

describe("faltasNaDisciplina", () => {
  it("conta só as aulas letivas em que o aluno faltou", () => {
    const aulas = [
      aula(1, "2026-05-11", { presencas: { "26007": false } }),
      aula(2, "2026-05-15", { semAula: "ferias", presencas: { "26007": false } }),
      aula(3, "2026-05-18"),
    ];

    expect(faltasNaDisciplina(aulas, "26007")).toBe(1);
  });
});

describe("definirPresenca", () => {
  it("grava só quem faltou", () => {
    // Gravar `true` para os presentes encheria o documento com a turma
    // inteira a cada aula, e o significado seria o mesmo.
    const marcada = definirPresenca(aula(1, "2026-05-11"), "26007", false);
    expect(marcada.presencas).toEqual({ "26007": false });
  });

  it("remover a falta apaga a marcação, não grava true", () => {
    const comFalta = aula(1, "2026-05-11", { presencas: { "26007": false } });
    const corrigida = definirPresenca(comFalta, "26007", true);

    expect(corrigida.presencas).toEqual({});
  });

  it("não altera a aula original", () => {
    const original = aula(1, "2026-05-11");
    definirPresenca(original, "26007", false);

    expect(original.presencas).toEqual({});
  });
});

describe("proximoNumero", () => {
  it("segue a numeração da pauta", () => {
    expect(proximoNumero([])).toBe(1);
    expect(proximoNumero([aula(1, "2026-05-11"), aula(2, "2026-05-15")])).toBe(3);
  });

  it("não reaproveita número de aula removida no meio", () => {
    expect(proximoNumero([aula(1, "2026-05-11"), aula(5, "2026-05-15")])).toBe(6);
  });
});

describe("verificarDataRepetida", () => {
  const aulas = [aula(1, "2026-05-11")];

  it("avisa quando já existe aula na data", () => {
    const conflito = verificarDataRepetida(aulas, "2026-05-11");
    expect(conflito.ok).toBe(false);
    expect(conflito.erro).toContain("aula 1");
  });

  it("aceita data nova", () => {
    expect(verificarDataRepetida(aulas, "2026-05-15").ok).toBe(true);
  });
});

describe("ordenarAulas", () => {
  it("ordena por data, que é como o professor lê a pauta", () => {
    const fora = [aula(2, "2026-05-22"), aula(1, "2026-05-11")];
    expect(ordenarAulas(fora).map((a) => a.numero)).toEqual([1, 2]);
  });
});

describe("resumirAulas e aulasSemConteudo", () => {
  const aulas = [
    aula(1, "2026-05-11", { presencas: { "26007": false, "25047": false } }),
    aula(2, "2026-05-15", { conteudo: "" }),
    aula(3, "2026-05-18", { semAula: "feriado", conteudo: "" }),
  ];

  it("resume cada aula para a lista", () => {
    expect(resumirAulas(aulas)[0]).toEqual({
      numero: 1,
      data: "2026-05-11",
      faltas: 2,
      temConteudo: true,
      semAula: null,
    });
  });

  it("aponta as aulas letivas sem conteúdo registrado", () => {
    // É o que a coordenação confere no diário.
    expect(aulasSemConteudo(aulas)).toEqual([2]);
  });

  it("não cobra conteúdo de dia sem aula", () => {
    expect(aulasSemConteudo(aulas)).not.toContain(3);
  });
});
