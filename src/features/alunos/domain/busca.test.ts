import { describe, expect, it } from "vitest";

import {
  filtrarAlunos,
  ordenarPorNome,
  turmasDaLista,
  type AlunoDaListagem,
} from "@/features/alunos/domain/busca";

const alunos: AlunoDaListagem[] = [
  {
    matricula: "26007",
    nome: "Alice Vianna Fernandes",
    turmaCodigo: "EM1A",
    ativo: true,
  },
  {
    matricula: "25047",
    nome: "Cauã Cananéa Ramos",
    turmaCodigo: "EM3A",
    ativo: true,
  },
  {
    matricula: "24001",
    nome: "Tiago Lopes Neo",
    turmaCodigo: "EF9A",
    ativo: true,
  },
  {
    matricula: "23001",
    nome: "Gabriela Perecmanis",
    turmaCodigo: "EM3A",
    ativo: false,
  },
];

describe("filtrarAlunos", () => {
  it("mostra só os ativos por padrão", () => {
    const resultado = filtrarAlunos(alunos);
    expect(resultado).toHaveLength(3);
    expect(resultado.every((a) => a.ativo)).toBe(true);
  });

  it("permite ver os ex-alunos quando pedido", () => {
    expect(filtrarAlunos(alunos, { situacao: "todos" })).toHaveLength(4);
    expect(filtrarAlunos(alunos, { situacao: "inativos" })).toHaveLength(1);
  });

  it("busca por parte do nome, no meio da palavra", () => {
    // O `where` do Firestore só casaria prefixo; a secretaria busca pelo
    // sobrenome tanto quanto pelo primeiro nome.
    expect(filtrarAlunos(alunos, { termo: "vianna" })).toHaveLength(1);
    expect(filtrarAlunos(alunos, { termo: "lopes" })).toHaveLength(1);
  });

  it("ignora acento e caixa na busca", () => {
    expect(filtrarAlunos(alunos, { termo: "caua" })).toHaveLength(1);
    expect(filtrarAlunos(alunos, { termo: "CAUÃ" })).toHaveLength(1);
  });

  it("busca por matrícula", () => {
    expect(filtrarAlunos(alunos, { termo: "26007" })[0].nome).toBe(
      "Alice Vianna Fernandes",
    );
  });

  it("filtra por turma", () => {
    expect(filtrarAlunos(alunos, { turma: "EM3A" })).toHaveLength(1);
    expect(
      filtrarAlunos(alunos, { turma: "EM3A", situacao: "todos" }),
    ).toHaveLength(2);
  });

  it("combina busca e turma", () => {
    expect(
      filtrarAlunos(alunos, { termo: "ramos", turma: "EM3A" }),
    ).toHaveLength(1);
    expect(
      filtrarAlunos(alunos, { termo: "ramos", turma: "EM1A" }),
    ).toHaveLength(0);
  });

  it("termo em branco não filtra nada", () => {
    expect(filtrarAlunos(alunos, { termo: "   " })).toHaveLength(3);
  });

  it("devolve vazio sem quebrar quando nada casa", () => {
    expect(filtrarAlunos(alunos, { termo: "zzz" })).toEqual([]);
    expect(filtrarAlunos([], { termo: "alice" })).toEqual([]);
  });
});

describe("ordenarPorNome", () => {
  it("ordena em português, ignorando acento", () => {
    const nomes = ordenarPorNome(alunos).map((a) => a.nome);
    expect(nomes).toEqual([
      "Alice Vianna Fernandes",
      "Cauã Cananéa Ramos",
      "Gabriela Perecmanis",
      "Tiago Lopes Neo",
    ]);
  });

  it("não altera a lista original", () => {
    const copia = [...alunos];
    ordenarPorNome(alunos);
    expect(alunos).toEqual(copia);
  });
});

describe("turmasDaLista", () => {
  it("lista as turmas presentes, sem repetição e ordenadas", () => {
    expect(turmasDaLista(alunos)).toEqual(["EF9A", "EM1A", "EM3A"]);
  });

  it("ignora aluno sem turma", () => {
    expect(
      turmasDaLista([{ matricula: "1", nome: "Sem Turma", ativo: true }]),
    ).toEqual([]);
  });
});
