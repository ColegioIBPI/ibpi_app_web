import { describe, expect, it } from "vitest";

import type { BoletimManual, LinhaDoBoletim } from "@/core/modelo";
import {
  boletimQueVale,
  colunaVisivel,
  copiarDoCalculado,
  divergenciaDaMedia,
  quadroQueVale,
  rotuloDaColuna,
} from "@/features/notas/domain/boletim-manual";

const linha = (campos: Partial<LinhaDoBoletim> = {}): LinhaDoBoletim => ({
  disciplinaId: "matematica",
  disciplinaNome: "Matemática",
  ordem: 10,
  trimestres: { "1": { projeto: 8, tarefas: 7, av: 9 } },
  mediasPorTrimestre: { "1": 8 },
  mediaAnual: 8,
  mediaParcial: 8,
  recuperacao: null,
  mediaFinal: 8,
  faltas: 2,
  situacao: "cursando",
  ...campos,
});

const manual = (campos: Partial<BoletimManual> = {}) =>
  ({
    oficial: false,
    disciplinas: [linha({ mediaFinal: 10 })],
    faltasPorTrimestre: { "1": 5 },
    percentualDeFrequencia: 0.9,
    situacao: "aprovado",
    observacoes: "Conselho de classe",
    rotulos: {},
    ocultas: [],
    ...campos,
  }) as BoletimManual;

describe("o retrato do calculado", () => {
  it("copia os valores, inclusive as médias já calculadas", () => {
    // É o ponto do recurso: a partir daqui nada se recalcula.
    const copia = copiarDoCalculado({
      disciplinas: [linha()],
      faltasPorTrimestre: { "1": 3 },
      percentualDeFrequencia: 0.8,
      situacao: "cursando",
    });

    expect(copia.disciplinas[0].mediasPorTrimestre["1"]).toBe(8);
    expect(copia.disciplinas[0].mediaFinal).toBe(8);
    expect(copia.faltasPorTrimestre).toEqual({ "1": 3 });
  });

  it("não guarda a referência do que foi copiado", () => {
    // O calculado é montado em memória a cada leitura. Guardar a
    // referência faria o documento gravado mudar junto com ele.
    const origem = linha();
    const copia = copiarDoCalculado({
      disciplinas: [origem],
      faltasPorTrimestre: {},
      percentualDeFrequencia: null,
      situacao: "cursando",
    });

    origem.trimestres["1"].projeto = 0;
    origem.mediasPorTrimestre["1"] = 0;

    expect(copia.disciplinas[0].trimestres["1"].projeto).toBe(8);
    expect(copia.disciplinas[0].mediasPorTrimestre["1"]).toBe(8);
  });
});

describe("qual boletim vale", () => {
  it("sem boletim 2, vale o calculado", () => {
    expect(boletimQueVale(null)).toBe("calculado");
    expect(boletimQueVale(manual())).toBe("calculado");
  });

  it("marcado como oficial, vale o boletim 2", () => {
    expect(boletimQueVale(manual({ oficial: true }))).toBe("manual");
  });

  it("o quadro oficial traz os valores e os rótulos do boletim 2", () => {
    const quadro = quadroQueVale({
      oficial: "manual",
      manual: manual({ oficial: true, rotulos: { av: "PROVA" } }),
      disciplinas: [linha()],
      faltasPorTrimestre: { "1": 1 },
      percentualDeFrequencia: 0.5,
      situacao: "cursando",
      observacoes: "do calculado",
    });

    expect(quadro.disciplinas[0].mediaFinal).toBe(10);
    expect(quadro.faltasPorTrimestre).toEqual({ "1": 5 });
    expect(quadro.situacao).toBe("aprovado");
    expect(quadro.observacoes).toBe("Conselho de classe");
    expect(quadro.rotulos).toEqual({ av: "PROVA" });
  });

  it("não sendo oficial, o quadro é o calculado e sem rótulos próprios", () => {
    const quadro = quadroQueVale({
      oficial: "calculado",
      manual: manual({ rotulos: { av: "PROVA" } }),
      disciplinas: [linha()],
      faltasPorTrimestre: { "1": 1 },
      percentualDeFrequencia: 0.5,
      situacao: "cursando",
    });

    expect(quadro.disciplinas[0].mediaFinal).toBe(8);
    expect(quadro.rotulos).toBeUndefined();
  });
});

describe("colunas", () => {
  it("sem troca, vale o rótulo do colégio", () => {
    expect(rotuloDaColuna("av", {})).toBe("AV");
    expect(rotuloDaColuna("total", undefined)).toBe("TOTAL");
  });

  it("rótulo trocado ganha; em branco não conta como troca", () => {
    expect(rotuloDaColuna("av", { av: "PROVA" })).toBe("PROVA");
    expect(rotuloDaColuna("av", { av: "   " })).toBe("AV");
  });

  it("esconder tira a coluna", () => {
    expect(colunaVisivel("recuperacao", ["recuperacao"])).toBe(false);
    expect(colunaVisivel("recuperacao", [])).toBe(true);
    expect(colunaVisivel("recuperacao", undefined)).toBe(true);
  });

  it("disciplina e as médias não se escondem", () => {
    // Sem elas o quadro deixa de ser boletim. O pedido é ignorado, e não
    // recusado: é a tela que não deve oferecer.
    for (const coluna of ["disciplina", "media", "mediaFinal"] as const) {
      expect(colunaVisivel(coluna, [coluna])).toBe(true);
    }
  });
});

describe("média que não bate com as notas", () => {
  it("aponta a média calculada quando difere", () => {
    // Divergir é permitido — é o ponto do boletim 2. O aviso existe para
    // a divergência ser escolhida, não um erro de digitação.
    expect(divergenciaDaMedia({ projeto: 6, tarefas: 6, av: 6 }, 9)).toBe(6);
  });

  it("não aponta nada quando bate", () => {
    expect(divergenciaDaMedia({ projeto: 8, tarefas: 7, av: 9 }, 8)).toBeNull();
  });

  it("diferença invisível no papel não vira aviso", () => {
    // O boletim imprime duas casas; abaixo disso, apontar é ruído.
    expect(
      divergenciaDaMedia({ projeto: 7, tarefas: 7, av: 7 }, 7.001),
    ).toBeNull();
  });

  it("sem as três avaliações, não há o que comparar", () => {
    expect(divergenciaDaMedia({ projeto: 8, tarefas: null, av: 9 }, 8)).toBeNull();
    expect(divergenciaDaMedia(undefined, 8)).toBeNull();
  });

  it("média em branco não é divergência", () => {
    expect(divergenciaDaMedia({ projeto: 8, tarefas: 7, av: 9 }, null)).toBeNull();
  });
});
