import { describe, expect, it } from "vitest";

import type { Matricula } from "@/core/modelo";
import {
  alunosParaPassar,
  turmasParaCriar,
  vinculosParaCriar,
  type AlocacaoComId,
  type TurmaComId,
} from "@/features/ano-letivo/domain/abertura";

const turma = (
  id: string,
  codigo: string,
  anoLetivo: number,
  ativa = true,
): TurmaComId =>
  ({ id, codigo, anoLetivo, ativa, segmento: "medio", turno: "manha" }) as TurmaComId;

const vinculo = (
  id: string,
  turmaCodigo: string,
  disciplinaId: string,
  anoLetivo: number,
  ativa = true,
): AlocacaoComId =>
  ({
    id,
    anoLetivo,
    ativa,
    professorId: "p1",
    turmaId: `${anoLetivo}-${turmaCodigo}`,
    turmaCodigo,
    disciplinaId,
  }) as AlocacaoComId;

const registro = (
  matricula: string,
  nome: string,
  turmaId: string,
  situacao: Matricula["situacao"] = "ativa",
): Matricula => ({ matricula, nome, turmaId, situacao }) as Matricula;

describe("turmas do ano novo", () => {
  const base = [turma("2026-EM1A", "EM1A", 2026), turma("2026-EM2A", "EM2A", 2026)];

  it("cria as que ainda não existem", () => {
    expect(turmasParaCriar(base, []).map((t) => t.codigo)).toEqual([
      "EM1A",
      "EM2A",
    ]);
  });

  it("compara por código: EM1A de 2026 e de 2027 são a mesma turma", () => {
    expect(
      turmasParaCriar(base, [turma("2027-EM1A", "EM1A", 2027)]).map((t) => t.codigo),
    ).toEqual(["EM2A"]);
  });

  it("rodar de novo não duplica nada", () => {
    const jaCriadas = [
      turma("2027-EM1A", "EM1A", 2027),
      turma("2027-EM2A", "EM2A", 2027),
    ];

    expect(turmasParaCriar(base, jaCriadas)).toEqual([]);
  });

  it("turma encerrada não atravessa", () => {
    // Se ela fechou, abrir de novo no ano seguinte seria ressuscitá-la
    // sem ninguém pedir.
    const comEncerrada = [...base, turma("2026-EF9A", "EF9A", 2026, false)];

    expect(turmasParaCriar(comEncerrada, []).map((t) => t.codigo)).not.toContain(
      "EF9A",
    );
  });
});

describe("vínculos do ano novo", () => {
  const base = [
    vinculo("a", "EM1A", "matematica", 2026),
    vinculo("b", "EM1A", "portugues", 2026),
  ];

  const codigo = () => null;

  it("copia os que faltam", () => {
    expect(vinculosParaCriar(base, [], codigo)).toHaveLength(2);
  });

  it("não duplica turma e disciplina que já têm vínculo no ano novo", () => {
    const existente = [vinculo("x", "EM1A", "matematica", 2027)];

    expect(
      vinculosParaCriar(base, existente, codigo).map(
        (v) => v.origem.disciplinaId,
      ),
    ).toEqual(["portugues"]);
  });

  it("vínculo desativado não é copiado", () => {
    const comInativo = [...base, vinculo("c", "EM1A", "fisica", 2026, false)];

    expect(
      vinculosParaCriar(comInativo, [], codigo).map((v) => v.origem.disciplinaId),
    ).not.toContain("fisica");
  });

  it("sem código de turma, o vínculo não vai", () => {
    // Apontaria para uma turma que não existe no ano novo.
    const orfao = [
      { ...vinculo("d", "", "fisica", 2026), turmaCodigo: undefined },
    ] as AlocacaoComId[];

    expect(vinculosParaCriar(orfao, [], () => null)).toEqual([]);
  });
});

describe("quem passa de ano", () => {
  const base = [
    registro("1", "Alice", "2026-EM1A"),
    registro("2", "Bruno", "2026-EM1A"),
    registro("3", "Carla", "2026-EM1A", "transferida"),
    registro("4", "Davi", "2026-EM2A"),
  ];

  it("só os ativos daquela turma", () => {
    // Concluído, transferido e cancelado não voltam no ano que vem.
    expect(alunosParaPassar(base, [], "2026-EM1A").map((r) => r.nome)).toEqual([
      "Alice",
      "Bruno",
    ]);
  });

  it("quem já passou não passa de novo", () => {
    const jaPassaram = [registro("1", "Alice", "2027-EM2A")];

    expect(
      alunosParaPassar(base, jaPassaram, "2026-EM1A").map((r) => r.nome),
    ).toEqual(["Bruno"]);
  });

  it("em ordem de nome, que é como a secretaria confere", () => {
    // A lista chega fora de ordem; sai alfabética.
    const fora = [
      registro("9", "Zuleica", "2026-EM1A"),
      registro("8", "Ágata", "2026-EM1A"),
      ...base,
    ];

    expect(alunosParaPassar(fora, [], "2026-EM1A").map((r) => r.nome)).toEqual([
      "Ágata",
      "Alice",
      "Bruno",
      "Zuleica",
    ]);
  });

  it("turma sem ninguém ativo devolve vazio", () => {
    expect(alunosParaPassar(base, [], "2026-EF6A")).toEqual([]);
  });
});
