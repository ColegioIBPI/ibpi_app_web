import { describe, expect, it } from "vitest";

import type { Nota } from "@/core/modelo";
import {
  idDaNota,
  linhasParaGravar,
  montarLancamento,
  paraNota,
  paraTexto,
  validarLancamento,
  type LinhaDeLancamento,
} from "@/features/notas/domain/lancamento";

const ALUNOS = [
  { matricula: "25047", nome: "Ana Souza" },
  { matricula: "26007", nome: "Bruno Lima" },
];

const linha = (
  matricula: string,
  projeto = "",
  tarefas = "",
  av = "",
  faltas = 0,
  jaLancado = false,
): LinhaDeLancamento => ({
  matricula,
  nome: matricula,
  avaliacoes: { projeto, tarefas, av },
  faltas,
  jaLancado,
});

describe("idDaNota", () => {
  it("é um por aluno, disciplina e trimestre", () => {
    expect(idDaNota(2026, 2, "26007", "fisica")).toBe(
      "2026-t2-26007-fisica",
    );
  });

  it("relançar o mesmo trimestre corrige em vez de duplicar", () => {
    expect(idDaNota(2026, 2, "26007", "fisica")).toBe(
      idDaNota(2026, 2, "26007", "fisica"),
    );
  });
});

describe("paraNota", () => {
  it("aceita vírgula decimal, que é como se escreve nota no Brasil", () => {
    expect(paraNota("7,5")).toEqual({ valor: 7.5 });
    expect(paraNota("7.5")).toEqual({ valor: 7.5 });
  });

  it("campo vazio é nota não lançada, não erro", () => {
    expect(paraNota("")).toEqual({ valor: null });
    expect(paraNota("   ")).toEqual({ valor: null });
  });

  it("aceita zero", () => {
    expect(paraNota("0")).toEqual({ valor: 0 });
  });

  it("recusa o que não é nota", () => {
    expect(paraNota("abc").erro).toContain("não é uma nota");
  });

  it("recusa nota fora da escala", () => {
    expect(paraNota("11").erro).toContain("0 a 10");
    expect(paraNota("-1").erro).toContain("0 a 10");
  });
});

describe("paraTexto", () => {
  it("mostra a nota com vírgula", () => {
    expect(paraTexto(7.5)).toBe("7,5");
  });

  it("nota ausente vira campo vazio", () => {
    expect(paraTexto(null)).toBe("");
    expect(paraTexto(undefined)).toBe("");
  });

  it("zero aparece, não some", () => {
    expect(paraTexto(0)).toBe("0");
  });
});

describe("montarLancamento", () => {
  it("carrega a turma inteira mesmo sem nota lançada", () => {
    const linhas = montarLancamento(ALUNOS, []);

    expect(linhas).toHaveLength(2);
    expect(linhas[0].avaliacoes).toEqual({ projeto: "", tarefas: "", av: "" });
    expect(linhas[0].jaLancado).toBe(false);
  });

  it("traz o que já foi lançado", () => {
    const nota = {
      matricula: "26007",
      avaliacoes: { projeto: 7, tarefas: 8, av: null },
      faltas: 3,
    } as Nota;

    const bruno = montarLancamento(ALUNOS, [nota])[1];

    expect(bruno.avaliacoes).toEqual({ projeto: "7", tarefas: "8", av: "" });
    expect(bruno.faltas).toBe(3);
    expect(bruno.jaLancado).toBe(true);
  });
});

describe("validarLancamento", () => {
  it("converte o que foi digitado", () => {
    const { linhas, erros } = validarLancamento([
      linha("26007", "7,5", "8", "0"),
    ]);

    expect(erros).toEqual({});
    expect(linhas[0].avaliacoes).toEqual({ projeto: 7.5, tarefas: 8, av: 0 });
  });

  it("prende o erro à matrícula, para a tela apontar a linha", () => {
    const { linhas, erros } = validarLancamento([
      linha("25047", "7", "7", "7"),
      linha("26007", "7", "abc", ""),
    ]);

    expect(erros["26007"]).toContain("Tarefas");
    expect(erros["25047"]).toBeUndefined();
    // A linha boa continua válida: um engano não invalida a turma inteira.
    expect(linhas).toHaveLength(1);
  });

  it("campo vazio vira nota nula, sem erro", () => {
    const { linhas, erros } = validarLancamento([linha("26007", "7", "", "")]);

    expect(erros).toEqual({});
    expect(linhas[0].avaliacoes).toEqual({
      projeto: 7,
      tarefas: null,
      av: null,
    });
  });
});

describe("linhasParaGravar", () => {
  it("ignora o que não mudou", () => {
    const originais = [linha("26007", "7", "8", "9", 2, true)];
    const atuais = [linha("26007", "7", "8", "9", 2, true)];

    expect(linhasParaGravar(atuais, originais)).toHaveLength(0);
  });

  it("'7,0' e '7' são a mesma nota digitada", () => {
    const originais = [linha("26007", "7", "8", "9", 0, true)];
    const atuais = [linha("26007", "7,0", "8", "9", 0, true)];

    expect(linhasParaGravar(atuais, originais)).toHaveLength(0);
  });

  it("pega a correção de nota", () => {
    const originais = [linha("26007", "7", "8", "9", 0, true)];
    const atuais = [linha("26007", "6", "8", "9", 0, true)];

    expect(linhasParaGravar(atuais, originais)).toHaveLength(1);
  });

  it("pega a mudança de faltas", () => {
    const originais = [linha("26007", "7", "8", "9", 0, true)];
    const atuais = [linha("26007", "7", "8", "9", 4, true)];

    expect(linhasParaGravar(atuais, originais)).toHaveLength(1);
  });

  it("nota inválida conta como alteração, para a validação alcançá-la", () => {
    // Tratar "11" como campo em branco tiraria a linha da lista, e o
    // professor salvaria sem gravar nada e sem receber aviso nenhum.
    const originais = [linha("26007", "", "", "", 0, true)];
    const atuais = [linha("26007", "11", "", "", 0, true)];

    expect(linhasParaGravar(atuais, originais)).toHaveLength(1);
  });

  it("não cria documento vazio para aluno sem nota nenhuma", () => {
    // Gravar a turma inteira em branco encheria o banco de documentos sem
    // informação.
    expect(linhasParaGravar([linha("26007")], [])).toHaveLength(0);
  });

  it("grava a primeira nota de quem ainda não tinha lançamento", () => {
    expect(linhasParaGravar([linha("26007", "7")], [])).toHaveLength(1);
  });
});
