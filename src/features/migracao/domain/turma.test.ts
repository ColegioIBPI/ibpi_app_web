import { describe, expect, it } from "vitest";

import { derivarTurma, idDaTurma } from "@/features/migracao/domain/turma";

describe("derivarTurma — casos reais da base", () => {
  it("ensino médio regular vira EM{série}A", () => {
    expect(derivarTurma({ curso: "EM", etapa: "1", turno: "M" })).toEqual({
      codigo: "EM1A",
      segmento: "medio",
      serie: "1",
      turno: "manha",
    });
    expect(derivarTurma({ curso: "EM", etapa: "3", turno: "M" })?.codigo).toBe(
      "EM3A",
    );
  });

  it("ensino fundamental regular vira EF{ano}A", () => {
    expect(derivarTurma({ curso: "EF", etapa: "9", turno: "M" })).toEqual({
      codigo: "EF9A",
      segmento: "fundamental",
      serie: "9",
      turno: "manha",
    });
  });

  it("curso EJA do médio cai na turma de EJA do médio", () => {
    expect(derivarTurma({ curso: "EM EJA", etapa: "3", turno: "T" })).toEqual({
      codigo: "E.J.A. EM",
      segmento: "eja-medio",
      serie: "3",
      turno: "tarde",
    });
  });

  it("série combinada indica EJA mesmo sem a palavra no curso", () => {
    // Na base, EF com etapa "89" e "6/7" está no E.J.A. EF — duas séries
    // dividindo a mesma sala.
    expect(derivarTurma({ curso: "EF", etapa: "89", turno: "T" })?.codigo).toBe(
      "E.J.A. EF",
    );
    expect(
      derivarTurma({ curso: "EF", etapa: "6/7", turno: "T" })?.codigo,
    ).toBe("E.J.A. EF");
  });

  it("série combinada do médio cai no EJA do médio", () => {
    expect(derivarTurma({ curso: "EJA", etapa: "23", turno: "T" })).toEqual({
      codigo: "E.J.A. EM",
      segmento: "eja-medio",
      serie: "23",
      turno: "tarde",
    });
  });

  it("traduz os turnos da base", () => {
    expect(derivarTurma({ curso: "EM", etapa: "2", turno: "M" })?.turno).toBe(
      "manha",
    );
    expect(derivarTurma({ curso: "EM", etapa: "2", turno: "T" })?.turno).toBe(
      "tarde",
    );
    // "E" é a hipótese de EJA Flex, ainda a confirmar com a secretaria.
    expect(derivarTurma({ curso: "EM", etapa: "2", turno: "E" })?.turno).toBe(
      "flex",
    );
  });

  it("ignora acento e caixa do curso", () => {
    expect(
      derivarTurma({ curso: " em ", etapa: "1", turno: "m" })?.codigo,
    ).toBe("EM1A");
  });

  it("devolve null quando falta curso ou série", () => {
    expect(derivarTurma({ curso: null, etapa: "1", turno: "M" })).toBeNull();
    expect(derivarTurma({ curso: "EM", etapa: null, turno: "M" })).toBeNull();
    expect(derivarTurma({ curso: "////", etapa: "1", turno: "M" })).toBeNull();
  });

  it("assume manhã quando o turno está em branco, sem descartar o aluno", () => {
    expect(derivarTurma({ curso: "EM", etapa: "1", turno: null })?.turno).toBe(
      "manha",
    );
  });
});

describe("idDaTurma", () => {
  it("amarra a turma ao ano letivo", () => {
    expect(idDaTurma(2026, "EM1A")).toBe("2026-EM1A");
  });

  it("gera id utilizável a partir de código com pontuação", () => {
    expect(idDaTurma(2026, "E.J.A. EM")).toBe("2026-EJAEM");
  });
});
