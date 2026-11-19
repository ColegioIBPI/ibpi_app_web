import { describe, expect, it } from "vitest";

import type { Aluno, Matricula } from "@/core/modelo";
import {
  alunosDaTurmaNoAno,
  idDaMatriculaDoAno,
  turmaDoAno,
} from "@/features/alunos/domain/matricula-do-ano";

/** O cadastro guarda a turma de **hoje** — depois da virada, a de 2027. */
const CADASTRO = {
  turmaId: "2027-EM3A",
  turmaCodigo: "EM3A",
  serie: "3",
  turno: "manha",
} as Pick<Aluno, "turmaId" | "turmaCodigo" | "serie" | "turno">;

const DE_2026 = {
  turmaId: "2026-EM2A",
  turmaCodigo: "EM2A",
  serie: "2",
  turno: "manha",
} as Pick<Matricula, "turmaId" | "turmaCodigo" | "serie" | "turno">;

describe("a turma daquele ano", () => {
  it("o registro do ano ganha do cadastro", () => {
    // O que faz o boletim de 2026 continuar sendo de 2026 depois da
    // virada. Sem isto ele procuraria alocações de uma turma de 2027
    // dentro de 2026 e sairia sem coluna nenhuma — sem erro na tela.
    expect(turmaDoAno(DE_2026, CADASTRO)).toEqual({
      turmaId: "2026-EM2A",
      turmaCodigo: "EM2A",
      serie: "2",
      turno: "manha",
    });
  });

  it("sem registro do ano, vale o cadastro", () => {
    // O ano em curso, e o aluno criado no portal sem gerar matrícula.
    expect(turmaDoAno(null, CADASTRO).turmaId).toBe("2027-EM3A");
  });

  it("a identificação também é a do ano", () => {
    // A segunda via do boletim de 2026 precisa dizer EM2A, 2ª série —
    // mesmo com o aluno já na EM3A.
    const doAno = turmaDoAno(DE_2026, CADASTRO);

    expect(doAno.turmaCodigo).toBe("EM2A");
    expect(doAno.serie).toBe("2");
  });

  it("cadastro sem turma devolve nulo, não `undefined`", () => {
    expect(
      turmaDoAno(null, {} as Pick<Aluno, "turmaId" | "turmaCodigo" | "serie" | "turno">),
    ).toEqual({ turmaId: null, turmaCodigo: null, serie: null, turno: null });
  });

  it("o id da matrícula é ano e matrícula", () => {
    expect(idDaMatriculaDoAno(2026, "26007")).toBe("2026-26007");
  });
});

describe("quem estava na turma naquele ano", () => {
  const alunos = [
    { matricula: "1", nome: "Alice", turmaId: "2027-EM3A" },
    { matricula: "2", nome: "Bruno", turmaId: "2027-EM3A" },
    { matricula: "3", nome: "Carla", turmaId: "2027-EM1A" },
  ];

  const de2026: Array<Pick<Matricula, "matricula" | "turmaId">> = [
    { matricula: "1", turmaId: "2026-EM2A" },
    { matricula: "2", turmaId: "2026-EM1A" },
  ];

  it("usa o registro do ano, não a turma de hoje", () => {
    // A ata de 2026 tirada em 2027 sairia com os alunos de 2027.
    expect(
      alunosDaTurmaNoAno(alunos, de2026, "2026-EM2A").map((a) => a.nome),
    ).toEqual(["Alice"]);
  });

  it("turma sem ninguém no ano devolve vazio, e não cai no cadastro", () => {
    // Se o ano tem registro, ele manda em tudo. Perguntar turma a turma
    // faria o cadastro responder justamente onde o ano diz "vazio".
    expect(alunosDaTurmaNoAno(alunos, de2026, "2026-EM3A")).toEqual([]);
  });

  it("ano sem registro nenhum usa o cadastro", () => {
    // É o estado do ano em curso, e o do aluno criado no portal.
    expect(
      alunosDaTurmaNoAno(alunos, [], "2027-EM3A").map((a) => a.nome),
    ).toEqual(["Alice", "Bruno"]);
  });

  it("aluno com registro de outra turma não entra", () => {
    expect(
      alunosDaTurmaNoAno(alunos, de2026, "2026-EM1A").map((a) => a.nome),
    ).toEqual(["Bruno"]);
  });

  it("registro de aluno fora do escopo da sessão não traz ninguém a mais", () => {
    // O escopo é aplicado antes: a lista que chega aqui já é a que a
    // pessoa pode ver, e o registro do ano só filtra.
    expect(
      alunosDaTurmaNoAno(
        [alunos[0]],
        [...de2026, { matricula: "99", turmaId: "2026-EM2A" }],
        "2026-EM2A",
      ).map((a) => a.nome),
    ).toEqual(["Alice"]);
  });
});
