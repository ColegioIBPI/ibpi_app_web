import { describe, expect, it } from "vitest";

import { outrasDaMesmaDisciplina } from "@/features/diario/domain/anterior";

const alocacao = (
  id: string,
  campos: Partial<{
    anoLetivo: number;
    turmaId: string;
    disciplinaId: string;
    professorNome: string;
  }> = {},
) => ({
  id,
  anoLetivo: 2026,
  turmaId: "2026-EM1A",
  disciplinaId: "matematica",
  professorNome: "Professor",
  ...campos,
});

const ATUAL = alocacao("2026-prof-novo-2026-EM1A-matematica");

describe("diário do professor anterior", () => {
  it("acha a alocação do outro professor na mesma turma e disciplina", () => {
    const encontradas = outrasDaMesmaDisciplina(
      [
        ATUAL,
        alocacao("2026-prof-antigo-2026-EM1A-matematica", {
          professorNome: "Ana",
        }),
      ],
      ATUAL,
    );

    expect(encontradas.map((a) => a.professorNome)).toEqual(["Ana"]);
  });

  it("não traz a própria alocação", () => {
    expect(outrasDaMesmaDisciplina([ATUAL], ATUAL)).toEqual([]);
  });

  it("não atravessa para outra disciplina, turma ou ano", () => {
    // É o limite que torna a autorização herdada defensável: quem abriu
    // esta alocação pode ler o que foi dado **nela**, não a escola inteira.
    const encontradas = outrasDaMesmaDisciplina(
      [
        alocacao("a", { disciplinaId: "portugues" }),
        alocacao("b", { turmaId: "2026-EM2A" }),
        alocacao("c", { anoLetivo: 2025 }),
      ],
      ATUAL,
    );

    expect(encontradas).toEqual([]);
  });

  it("traz também a alocação ainda ativa", () => {
    // Durante a passagem de bastão as duas convivem, e é aí que o
    // professor novo mais precisa ler: ele não consegue abrir a alocação
    // do colega nem enquanto ela vale.
    const encontradas = outrasDaMesmaDisciplina(
      [alocacao("outra", { professorNome: "Ana" })],
      ATUAL,
    );

    expect(encontradas).toHaveLength(1);
  });

  it("ordena por nome, para a lista não mudar de ordem a cada abertura", () => {
    const encontradas = outrasDaMesmaDisciplina(
      [
        alocacao("c", { professorNome: "Carla" }),
        alocacao("a", { professorNome: "Ana" }),
        alocacao("b", { professorNome: "Bruno" }),
      ],
      ATUAL,
    );

    expect(encontradas.map((a) => a.professorNome)).toEqual([
      "Ana",
      "Bruno",
      "Carla",
    ]);
  });

  it("dois professores anteriores aparecem os dois", () => {
    // A disciplina pode ter trocado de mão mais de uma vez no ano.
    const encontradas = outrasDaMesmaDisciplina(
      [
        alocacao("a", { professorNome: "Ana" }),
        alocacao("b", { professorNome: "Bruno" }),
        ATUAL,
      ],
      ATUAL,
    );

    expect(encontradas).toHaveLength(2);
  });
});
