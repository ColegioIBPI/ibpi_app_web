import { describe, expect, it } from "vitest";

import type { FrequenciaDiaria } from "@/core/modelo";
import {
  consolidarPeriodo,
  periodoDaQuery,
  periodoInvertido,
  resumirPeriodo,
} from "@/features/frequencia/domain/periodo";

const ALUNOS = [
  { matricula: "26007", nome: "Alice Vianna" },
  { matricula: "25047", nome: "Cauã Cananéa" },
];

const lancamento = (
  matricula: string,
  data: string,
  situacao: "presente" | "falta" | "atraso",
): FrequenciaDiaria =>
  ({ matricula, data, situacao, turmaId: "2026-EM1A" }) as FrequenciaDiaria;

describe("consolidarPeriodo", () => {
  it("traz a turma inteira, inclusive quem não tem lançamento", () => {
    // Deixar de fora quem nunca faltou esconderia metade da turma, e é a
    // turma inteira que a coordenação quer ver.
    const linhas = consolidarPeriodo(ALUNOS, [
      lancamento("26007", "2026-09-01", "falta"),
    ]);

    expect(linhas).toHaveLength(2);
    expect(linhas.find((l) => l.matricula === "25047")?.contadores.dias).toBe(0);
  });

  it("conta presenças, faltas e atrasos por aluno", () => {
    const linhas = consolidarPeriodo(ALUNOS, [
      lancamento("26007", "2026-09-01", "presente"),
      lancamento("26007", "2026-09-02", "falta"),
      lancamento("26007", "2026-09-03", "atraso"),
    ]);

    const alice = linhas.find((l) => l.matricula === "26007")!;
    expect(alice.contadores).toEqual({
      presencas: 1,
      faltas: 1,
      atrasos: 1,
      dias: 3,
    });
  });

  it("atraso conta como presença no percentual", () => {
    const linhas = consolidarPeriodo([ALUNOS[0]], [
      lancamento("26007", "2026-09-01", "atraso"),
      lancamento("26007", "2026-09-02", "falta"),
    ]);

    expect(linhas[0].percentual).toBe(0.5);
  });

  it("sem dia registrado o percentual fica em branco, não zero", () => {
    // "0% de presença" no começo do ano assustaria a família à toa.
    expect(consolidarPeriodo(ALUNOS, [])[0].percentual).toBeNull();
  });

  it("ordena por nome", () => {
    expect(consolidarPeriodo(ALUNOS, []).map((l) => l.nome)).toEqual([
      "Alice Vianna",
      "Cauã Cananéa",
    ]);
  });

  it("ignora lançamento de aluno que não está na lista", () => {
    const linhas = consolidarPeriodo([ALUNOS[0]], [
      lancamento("99999", "2026-09-01", "falta"),
    ]);

    expect(linhas).toHaveLength(1);
    expect(linhas[0].contadores.dias).toBe(0);
  });
});

describe("periodoDaQuery", () => {
  const hoje = new Date(2026, 8, 24); // 24/09/2026

  it("sem período, usa o mês corrente", () => {
    expect(periodoDaQuery(undefined, undefined, hoje)).toEqual({
      de: "2026-09-01",
      ate: "2026-09-24",
    });
  });

  it("aceita o período informado", () => {
    expect(periodoDaQuery("2026-03-01", "2026-03-31", hoje)).toEqual({
      de: "2026-03-01",
      ate: "2026-03-31",
    });
  });

  it("ignora data mal formada e volta ao padrão", () => {
    expect(periodoDaQuery("01/03/2026", ["x"], hoje)).toEqual({
      de: "2026-09-01",
      ate: "2026-09-24",
    });
  });
});

describe("periodoInvertido", () => {
  it("aponta o período de trás para frente", () => {
    expect(periodoInvertido({ de: "2026-09-30", ate: "2026-09-01" })).toBe(true);
  });

  it("um único dia não é invertido", () => {
    expect(periodoInvertido({ de: "2026-09-01", ate: "2026-09-01" })).toBe(false);
  });
});

describe("resumirPeriodo", () => {
  it("soma a turma e conta quem está abaixo do mínimo", () => {
    const linhas = consolidarPeriodo(ALUNOS, [
      lancamento("26007", "2026-09-01", "presente"),
      lancamento("26007", "2026-09-02", "presente"),
      lancamento("25047", "2026-09-01", "falta"),
      lancamento("25047", "2026-09-02", "falta"),
    ]);

    const resumo = resumirPeriodo(linhas);

    expect(resumo.alunos).toBe(2);
    expect(resumo.dias).toBe(4);
    expect(resumo.presencas).toBe(2);
    expect(resumo.faltas).toBe(2);
    expect(resumo.percentual).toBe(0.5);
    expect(resumo.abaixoDoMinimo).toBe(1);
  });

  it("quem ainda não tem registro não conta como abaixo do mínimo", () => {
    expect(resumirPeriodo(consolidarPeriodo(ALUNOS, [])).abaixoDoMinimo).toBe(0);
  });
});
