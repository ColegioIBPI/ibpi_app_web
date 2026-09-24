import { describe, expect, it } from "vitest";

import {
  filtrarLinhas,
  recorteDaQuery,
  resumir,
  type LinhaFinanceira,
} from "@/features/financeiro/domain/lista";

const linha = (
  matricula: string,
  nome: string,
  turmaCodigo: string | null,
  vencido: number,
  emAberto = vencido,
): LinhaFinanceira => ({
  matricula,
  nome,
  turmaCodigo,
  totais: {
    parcelas: 1,
    contratado: 1000,
    pago: 1000 - emAberto,
    emAberto,
    vencido,
  },
});

const ESCOLA = [
  linha("26007", "Alice Vianna", "EM1A", 500),
  linha("25047", "Cauã Cananéa", "EM3A", 0, 800),
  linha("26029", "Eduardo Samuel", "EM2A", 0, 0),
];

describe("filtrarLinhas", () => {
  it("por padrão mostra só quem tem parcela vencida", () => {
    // É a pergunta que traz alguém a esta tela.
    expect(filtrarLinhas(ESCOLA).map((l) => l.matricula)).toEqual(["26007"]);
  });

  it("o recorte de saldo em aberto inclui o que ainda não venceu", () => {
    expect(
      filtrarLinhas(ESCOLA, { recorte: "em-aberto" }).map((l) => l.matricula),
    ).toEqual(["26007", "25047"]);
  });

  it("o recorte de todos não esconde quem está quite", () => {
    expect(filtrarLinhas(ESCOLA, { recorte: "todos" })).toHaveLength(3);
  });

  it("busca por nome ignora acento e caixa", () => {
    expect(
      filtrarLinhas(ESCOLA, { recorte: "todos", termo: "caua" }).map(
        (l) => l.matricula,
      ),
    ).toEqual(["25047"]);
  });

  it("busca por matrícula", () => {
    expect(
      filtrarLinhas(ESCOLA, { recorte: "todos", termo: "26029" }).map(
        (l) => l.nome,
      ),
    ).toEqual(["Eduardo Samuel"]);
  });

  it("filtra por turma", () => {
    expect(
      filtrarLinhas(ESCOLA, { recorte: "todos", turma: "EM2A" }),
    ).toHaveLength(1);
  });

  it("combina turma e recorte", () => {
    // Sem a combinação, a secretaria ligaria para a família errada.
    expect(
      filtrarLinhas(ESCOLA, { recorte: "vencidas", turma: "EM3A" }),
    ).toEqual([]);
  });

  it("busca que não acha nada devolve lista vazia", () => {
    expect(
      filtrarLinhas(ESCOLA, { recorte: "todos", termo: "zzz" }),
    ).toEqual([]);
  });
});

describe("resumir", () => {
  it("soma sobre a escola inteira, não sobre o filtro", () => {
    expect(resumir(ESCOLA)).toEqual({
      alunos: 3,
      inadimplentes: 1,
      vencido: 500,
      emAberto: 1300,
    });
  });

  it("escola sem lançamento zera tudo", () => {
    expect(resumir([])).toEqual({
      alunos: 0,
      inadimplentes: 0,
      vencido: 0,
      emAberto: 0,
    });
  });

  it("soma sem erro de ponto flutuante", () => {
    const centavos = [linha("1", "A", null, 0.1), linha("2", "B", null, 0.2)];

    expect(resumir(centavos).vencido).toBe(0.3);
  });
});

describe("recorteDaQuery", () => {
  it("aceita os recortes conhecidos", () => {
    expect(recorteDaQuery("todos")).toBe("todos");
    expect(recorteDaQuery("em-aberto")).toBe("em-aberto");
  });

  it("qualquer outra coisa cai na inadimplência", () => {
    expect(recorteDaQuery(undefined)).toBe("vencidas");
    expect(recorteDaQuery("banana")).toBe("vencidas");
    expect(recorteDaQuery(["todos"])).toBe("vencidas");
  });
});
