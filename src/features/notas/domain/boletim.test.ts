import { describe, expect, it } from "vitest";

import type { Dependencia, Nota } from "@/core/modelo";
import {
  disciplinasEmRecuperacao,
  montarBoletim,
  montarLinhas,
  somarFaltasPorTrimestre,
  trimestresLancados,
} from "@/features/notas/domain/boletim";

const nota = (
  disciplinaId: string,
  trimestre: 1 | 2 | 3,
  notas: [number | null, number | null, number | null],
  faltas = 0,
): Nota =>
  ({
    anoLetivo: 2026,
    trimestre,
    matricula: "26007",
    turmaId: "2026-EM2A",
    disciplinaId,
    disciplinaNome: disciplinaId === "fisica" ? "Física" : "Artes",
    avaliacoes: { projeto: notas[0], tarefas: notas[1], av: notas[2] },
    faltas,
    origem: "portal",
  }) as Nota;

const anoCompleto = (disciplinaId: string, valor: number, faltas = 0) => [
  nota(disciplinaId, 1, [valor, valor, valor], faltas),
  nota(disciplinaId, 2, [valor, valor, valor], faltas),
  nota(disciplinaId, 3, [valor, valor, valor], faltas),
];

describe("montarLinhas", () => {
  it("agrupa as notas por disciplina", () => {
    const linhas = montarLinhas(
      [...anoCompleto("fisica", 7), ...anoCompleto("artes", 8)],
      {},
      1,
    );

    expect(linhas).toHaveLength(2);
    // Em ordem alfabética, como no boletim impresso.
    expect(linhas.map((l) => l.disciplinaNome)).toEqual(["Artes", "Física"]);
  });

  it("fecha a média anual e a situação", () => {
    const [fisica] = montarLinhas(anoCompleto("fisica", 7), {}, 1);

    expect(fisica.mediasPorTrimestre).toEqual({ "1": 7, "2": 7, "3": 7 });
    expect(fisica.mediaAnual).toBe(7);
    expect(fisica.situacao).toBe("aprovado");
  });

  it("aplica a recuperação lançada no boletim", () => {
    const [fisica] = montarLinhas(anoCompleto("fisica", 4), { fisica: 8 }, 1);

    expect(fisica.recuperacao).toBe(8);
    expect(fisica.mediaFinal).toBe(6);
    expect(fisica.situacao).toBe("aprovado");
  });

  it("soma as faltas dos três trimestres", () => {
    const [fisica] = montarLinhas(anoCompleto("fisica", 7, 2), {}, 1);

    expect(fisica.faltas).toBe(6);
  });

  it("com o ano em andamento a linha fica cursando", () => {
    const [fisica] = montarLinhas([nota("fisica", 1, [7, 7, 7])], {}, 1);

    expect(fisica.mediaAnual).toBeNull();
    expect(fisica.situacao).toBe("cursando");
  });

  it("frequência abaixo de 75% reprova em todas as disciplinas", () => {
    // O limite de 25% é da carga horária total, então quem passa dele
    // reprova em tudo.
    const linhas = montarLinhas(
      [...anoCompleto("fisica", 9), ...anoCompleto("artes", 9)],
      {},
      0.6,
    );

    expect(linhas.every((l) => l.situacao === "reprovado-por-falta")).toBe(true);
  });
});

describe("somarFaltasPorTrimestre", () => {
  it("soma por trimestre, entre disciplinas", () => {
    expect(
      somarFaltasPorTrimestre([
        nota("fisica", 1, [7, 7, 7], 2),
        nota("artes", 1, [7, 7, 7], 3),
        nota("fisica", 2, [7, 7, 7], 1),
      ]),
    ).toEqual({ "1": 5, "2": 1, "3": 0 });
  });

  it("sem notas devolve os três trimestres zerados", () => {
    expect(somarFaltasPorTrimestre([])).toEqual({ "1": 0, "2": 0, "3": 0 });
  });
});

describe("montarBoletim", () => {
  it("consolida disciplinas, faltas e situação do ano", () => {
    const boletim = montarBoletim({
      notas: [...anoCompleto("fisica", 7, 1), ...anoCompleto("artes", 4)],
      recuperacoes: {},
      dependencias: [],
      percentualDeFrequencia: 0.9,
    });

    expect(boletim.disciplinas).toHaveLength(2);
    expect(boletim.faltasPorTrimestre).toEqual({ "1": 1, "2": 1, "3": 1 });
    // Artes em recuperação segura o resultado do ano.
    expect(boletim.situacao).toBe("recuperacao");
  });

  it("calcula as dependências com o cálculo próprio delas", () => {
    const dependencia = {
      disciplinaId: "matematica",
      disciplinaNome: "Matemática",
      tipo: "dependencia",
      p1: 6,
      p2: 8,
      total: null,
      recuperacao: null,
      media: null,
      situacao: "cursando",
    } as Dependencia;

    const boletim = montarBoletim({
      notas: [],
      recuperacoes: {},
      dependencias: [dependencia],
      percentualDeFrequencia: 1,
    });

    expect(boletim.dependencias[0].total).toBe(14);
    expect(boletim.dependencias[0].media).toBe(7);
    expect(boletim.dependencias[0].situacao).toBe("aprovado");
  });

  it("a dependência não decide a situação do ano corrente", () => {
    const reprovada = {
      disciplinaId: "matematica",
      disciplinaNome: "Matemática",
      tipo: "dependencia",
      p1: 2,
      p2: 2,
      total: null,
      recuperacao: 2,
      media: null,
      situacao: "cursando",
    } as Dependencia;

    const boletim = montarBoletim({
      notas: anoCompleto("fisica", 8),
      recuperacoes: {},
      dependencias: [reprovada],
      percentualDeFrequencia: 1,
    });

    expect(boletim.dependencias[0].situacao).toBe("reprovado");
    expect(boletim.situacao).toBe("aprovado");
  });

  it("sem notas o ano está em curso", () => {
    const boletim = montarBoletim({
      notas: [],
      recuperacoes: {},
      dependencias: [],
      percentualDeFrequencia: null,
    });

    expect(boletim.situacao).toBe("cursando");
    expect(boletim.disciplinas).toEqual([]);
  });
});

describe("disciplinasEmRecuperacao", () => {
  it("lista o que a secretaria precisa convocar", () => {
    const linhas = montarLinhas(
      [...anoCompleto("fisica", 4), ...anoCompleto("artes", 8)],
      {},
      1,
    );

    expect(disciplinasEmRecuperacao(linhas).map((l) => l.disciplinaId)).toEqual(
      ["fisica"],
    );
  });
});

describe("trimestresLancados", () => {
  it("aponta os trimestres que já têm nota", () => {
    expect(
      trimestresLancados([nota("fisica", 1, [7, 7, 7]), nota("fisica", 3, [7, 7, 7])]),
    ).toEqual([1, 3]);
  });
});
