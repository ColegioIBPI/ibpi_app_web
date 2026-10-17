import { describe, expect, it } from "vitest";

import {
  agruparCriterios,
  criterioQueVale,
  resumoDoCriterio,
} from "@/features/cursos/domain/criterio";

const geral = {
  id: "2026",
  anoLetivo: 2026,
  cursoCodigo: null,
  publicado: true,
};
const doEja = {
  id: "2026-eja-medio",
  anoLetivo: 2026,
  cursoCodigo: "eja-medio",
  publicado: true,
};
const rascunho = {
  id: "2027",
  anoLetivo: 2027,
  cursoCodigo: null,
  publicado: false,
};

describe("qual critério vale", () => {
  it("o do curso ganha do geral", () => {
    // Se o colégio publicou um critério só para o EJA, é porque o geral
    // não se aplica ali.
    expect(criterioQueVale([geral, doEja], 2026, "eja-medio")?.id).toBe(
      "2026-eja-medio",
    );
  });

  it("curso sem critério próprio cai no geral", () => {
    expect(criterioQueVale([geral, doEja], 2026, "medio")?.id).toBe("2026");
  });

  it("aluno sem curso cai no geral", () => {
    expect(criterioQueVale([geral, doEja], 2026, null)?.id).toBe("2026");
  });

  it("não atravessa o ano letivo", () => {
    // O critério de 2026 não vale para o boletim de 2025.
    expect(criterioQueVale([geral], 2025, "medio")).toBeNull();
  });

  it("a família não vê rascunho", () => {
    expect(criterioQueVale([rascunho], 2027, null)).toBeNull();
  });

  it("a equipe vê rascunho quando pede", () => {
    expect(criterioQueVale([rascunho], 2027, null, false)?.id).toBe("2027");
  });

  it("devolve null quando não há nada publicado", () => {
    expect(criterioQueVale([], 2026, "medio")).toBeNull();
  });
});

describe("resumo de uma linha", () => {
  const base = {
    periodos: 3,
    nomeDoPeriodo: "Trimestre",
    avaliacoes: [
      { nome: "Projeto", peso: null, descricao: null },
      { nome: "Tarefas", peso: null, descricao: null },
      { nome: "AV", peso: null, descricao: null },
    ],
    mediaMinima: 5,
    frequenciaMinima: 75,
  };

  it("monta a frase que estava escrita à mão na tela", () => {
    expect(resumoDoCriterio(base)).toBe(
      "3 trimestres · Projeto + Tarefas + AV · aprovação com média 5,0 e frequência de 75%",
    );
  });

  it("não pluraliza período único", () => {
    expect(resumoDoCriterio({ ...base, periodos: 1 })).toContain("1 trimestre ·");
  });

  it("aguenta critério sem avaliação listada", () => {
    expect(resumoDoCriterio({ ...base, avaliacoes: [] })).toBe(
      "3 trimestres · aprovação com média 5,0 e frequência de 75%",
    );
  });

  it("usa vírgula decimal, como o boletim imprime", () => {
    expect(
      resumoDoCriterio({ ...base, mediaMinima: 6.5, frequenciaMinima: 72.5 }),
    ).toContain("média 6,5 e frequência de 72,5%");
  });
});

describe("critérios de uma família", () => {
  const geral = { id: "2026" };
  const eja = { id: "2026-eja-medio" };

  it("irmãos sob a mesma regra viram um bloco só", () => {
    // Repetir o mesmo texto uma vez por filho encheria a tela.
    expect(
      agruparCriterios([
        { cursoRotulo: "Ensino Médio", criterio: geral },
        { cursoRotulo: "Ensino Fundamental", criterio: geral },
      ]),
    ).toEqual([
      { criterio: geral, cursos: ["Ensino Médio", "Ensino Fundamental"] },
    ]);
  });

  it("dois filhos no mesmo curso não repetem o rótulo", () => {
    expect(
      agruparCriterios([
        { cursoRotulo: "Ensino Médio", criterio: geral },
        { cursoRotulo: "Ensino Médio", criterio: geral },
      ])[0].cursos,
    ).toEqual(["Ensino Médio"]);
  });

  it("critérios diferentes aparecem os dois", () => {
    // Mostrar só o primeiro esconderia metade da resposta da família.
    const grupos = agruparCriterios([
      { cursoRotulo: "Ensino Médio", criterio: geral },
      { cursoRotulo: "EJA — Médio", criterio: eja },
    ]);

    expect(grupos.map((g) => g.criterio.id)).toEqual(["2026", "2026-eja-medio"]);
  });

  it("filho sem critério publicado não vira bloco vazio", () => {
    expect(
      agruparCriterios([{ cursoRotulo: "Ensino Médio", criterio: null }]),
    ).toEqual([]);
  });
});
