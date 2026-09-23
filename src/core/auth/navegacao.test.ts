import { describe, expect, it } from "vitest";

import { navegacaoDisponivelPara, navegacaoPara } from "@/core/auth/navegacao";
import { areaDoPerfil, pode, ROLES } from "@/core/auth/roles";

const rotulos = (role: Parameters<typeof navegacaoPara>[0]) =>
  navegacaoPara(role).map((item) => item.rotulo);

describe("navegacaoPara", () => {
  it("financeiro vê só o financeiro e o cadastro", () => {
    expect(rotulos("financeiro")).toEqual(["Alunos", "Avisos", "Financeiro"]);
  });

  it("professor não vê financeiro nem gestão de turmas", () => {
    const itens = rotulos("professor");
    expect(itens).toContain("Frequência");
    expect(itens).toContain("Notas");
    expect(itens).toContain("Ocorrências");
    expect(itens).not.toContain("Financeiro");
    // Turmas e Disciplinas exigem gerenciar cadastro, que o professor não
    // tem — ele chega às disciplinas pelo diário de classe.
    expect(itens).not.toContain("Turmas");
    expect(itens).not.toContain("Disciplinas");
    expect(itens).not.toContain("Responsáveis");
    expect(itens).not.toContain("Professores");
  });

  it("secretaria vê todos os itens de gestão", () => {
    expect(rotulos("secretaria")).toEqual([
      "Alunos",
      "Responsáveis",
      "Professores",
      "Turmas",
      "Disciplinas",
      "Frequência",
      "Ocorrências",
      "Notas",
      "Avisos",
      "Financeiro",
    ]);
  });

  it("aluno não vê ocorrências nem financeiro", () => {
    expect(rotulos("aluno")).toEqual(["Avisos", "Boletim", "Frequência"]);
  });

  it("responsável vê tudo da área de consulta", () => {
    expect(rotulos("responsavel")).toEqual([
      "Avisos",
      "Boletim",
      "Frequência",
      "Ocorrências",
      "Financeiro",
    ]);
  });

  it("cada perfil só recebe itens da própria área", () => {
    for (const role of ROLES) {
      const area = areaDoPerfil(role);
      for (const item of navegacaoPara(role)) {
        expect(item.area).toBe(area);
      }
    }
  });

  it("nenhum item aparece para quem não tem permissão no recurso", () => {
    for (const role of ROLES) {
      for (const item of navegacaoPara(role)) {
        expect(pode(role, item.recurso, item.minimo)).toBe(true);
      }
    }
  });

  it("todo perfil tem ao menos um item de menu", () => {
    for (const role of ROLES) {
      expect(navegacaoPara(role).length).toBeGreaterThan(0);
    }
  });
});

describe("navegacaoDisponivelPara", () => {
  it("devolve só o que já foi implementado", () => {
    for (const role of ROLES) {
      for (const item of navegacaoDisponivelPara(role)) {
        expect(item.disponivel).toBe(true);
      }
    }
  });

  it("é sempre um subconjunto do que o perfil tem direito de ver", () => {
    for (const role of ROLES) {
      const permitidos = new Set(navegacaoPara(role).map((i) => i.href));
      for (const item of navegacaoDisponivelPara(role)) {
        expect(permitidos.has(item.href)).toBe(true);
      }
    }
  });
});
