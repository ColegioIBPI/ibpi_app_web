import { describe, expect, it } from "vitest";

import {
  areaDoPerfil,
  escopoDeAlunos,
  isEquipe,
  isRole,
  nivelDeAcesso,
  pode,
  podeVer,
  ROLES,
  rotaInicial,
  rotuloDoPerfil,
  type Recurso,
  type Role,
} from "@/core/auth/roles";

const RECURSOS: Recurso[] = [
  "cadastros",
  "frequencia",
  "ocorrencias",
  "notas",
  "financeiro",
];

describe("isRole", () => {
  it("aceita os seis perfis conhecidos", () => {
    for (const role of ROLES) expect(isRole(role)).toBe(true);
  });

  it("rejeita valor desconhecido vindo do banco ou do token", () => {
    expect(isRole("admin")).toBe(false);
    expect(isRole("")).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(42)).toBe(false);
  });
});

describe("pode — níveis cumulativos", () => {
  it("quem gerencia também lança e lê", () => {
    expect(nivelDeAcesso("secretaria", "cadastros")).toBe("gerenciar");
    expect(pode("secretaria", "cadastros", "gerenciar")).toBe(true);
    expect(pode("secretaria", "cadastros", "lancar")).toBe(true);
    expect(pode("secretaria", "cadastros", "ler")).toBe(true);
  });

  it("quem lança não necessariamente gerencia", () => {
    expect(pode("professor", "notas", "lancar")).toBe(true);
    expect(pode("professor", "notas", "gerenciar")).toBe(false);
  });

  it("quem só lê não lança", () => {
    expect(pode("responsavel", "notas", "ler")).toBe(true);
    expect(pode("responsavel", "notas", "lancar")).toBe(false);
  });

  it("sem acesso é sem acesso, para qualquer ação", () => {
    expect(pode("aluno", "financeiro", "ler")).toBe(false);
    expect(pode("aluno", "financeiro", "lancar")).toBe(false);
    expect(pode("aluno", "financeiro", "gerenciar")).toBe(false);
  });
});

describe("matriz de acesso — README seção 3.1", () => {
  it("financeiro não enxerga vida escolar", () => {
    expect(podeVer("financeiro", "notas")).toBe(false);
    expect(podeVer("financeiro", "frequencia")).toBe(false);
    expect(podeVer("financeiro", "ocorrencias")).toBe(false);
    // Lê cadastro apenas para contato e cobrança.
    expect(podeVer("financeiro", "cadastros")).toBe(true);
    expect(pode("financeiro", "financeiro", "lancar")).toBe(true);
  });

  it("aluno não enxerga ocorrência disciplinar nem financeiro", () => {
    expect(podeVer("aluno", "ocorrencias")).toBe(false);
    expect(podeVer("aluno", "financeiro")).toBe(false);
    expect(podeVer("aluno", "notas")).toBe(true);
    expect(podeVer("aluno", "frequencia")).toBe(true);
  });

  it("responsável enxerga tudo dos filhos, inclusive ocorrência e financeiro", () => {
    for (const recurso of RECURSOS) {
      expect(podeVer("responsavel", recurso)).toBe(true);
    }
    // Mas é somente leitura.
    for (const recurso of RECURSOS) {
      expect(pode("responsavel", recurso, "lancar")).toBe(false);
    }
  });

  it("professor lança vida escolar mas não toca no financeiro", () => {
    expect(pode("professor", "frequencia", "lancar")).toBe(true);
    expect(pode("professor", "ocorrencias", "lancar")).toBe(true);
    expect(pode("professor", "notas", "lancar")).toBe(true);
    expect(podeVer("professor", "financeiro")).toBe(false);
  });

  it("secretaria e coordenação têm hoje a mesma permissão", () => {
    for (const recurso of RECURSOS) {
      expect(nivelDeAcesso("secretaria", recurso)).toBe(
        nivelDeAcesso("coordenacao", recurso),
      );
    }
  });

  it("nenhum perfil além de secretaria e coordenação gerencia cadastro", () => {
    const gerenciam = ROLES.filter((role) =>
      pode(role, "cadastros", "gerenciar"),
    );
    expect(gerenciam).toEqual(["secretaria", "coordenacao"]);
  });

  it("só o financeiro lança cobrança", () => {
    const lancam = ROLES.filter((role) => pode(role, "financeiro", "lancar"));
    expect(lancam).toEqual(["financeiro"]);
  });
});

describe("escopo de alunos", () => {
  it("recorta o que cada perfil enxerga", () => {
    expect(escopoDeAlunos("secretaria")).toBe("todos");
    expect(escopoDeAlunos("coordenacao")).toBe("todos");
    expect(escopoDeAlunos("financeiro")).toBe("todos");
    expect(escopoDeAlunos("professor")).toBe("turmas-lecionadas");
    expect(escopoDeAlunos("responsavel")).toBe("filhos");
    expect(escopoDeAlunos("aluno")).toBe("proprio");
  });

  it("permissão de leitura do professor nunca significa a escola inteira", () => {
    expect(podeVer("professor", "frequencia")).toBe(true);
    expect(escopoDeAlunos("professor")).not.toBe("todos");
  });
});

describe("área e rota inicial", () => {
  it("equipe escolar vai para a gestão", () => {
    for (const role of [
      "secretaria",
      "coordenacao",
      "financeiro",
      "professor",
    ] as Role[]) {
      expect(areaDoPerfil(role)).toBe("gestao");
      expect(isEquipe(role)).toBe(true);
      expect(rotaInicial(role)).toBe("/gestao");
    }
  });

  it("família vai para a consulta", () => {
    for (const role of ["aluno", "responsavel"] as Role[]) {
      expect(areaDoPerfil(role)).toBe("consulta");
      expect(isEquipe(role)).toBe(false);
      expect(rotaInicial(role)).toBe("/portal");
    }
  });
});

describe("rótulos", () => {
  it("todo perfil tem rótulo legível, sem sobra nem falta", () => {
    const rotulos = ROLES.map(rotuloDoPerfil);
    expect(rotulos).toEqual([
      "Aluno",
      "Responsável",
      "Professor",
      "Secretaria",
      "Coordenação",
      "Financeiro",
    ]);
    expect(new Set(rotulos).size).toBe(ROLES.length);
  });
});

describe("integridade da matriz", () => {
  it("todo perfil declara um nível para todo recurso", () => {
    for (const role of ROLES) {
      for (const recurso of RECURSOS) {
        expect(nivelDeAcesso(role, recurso)).toBeDefined();
      }
    }
  });

  it("todo perfil enxerga ao menos um recurso — ninguém entra numa tela vazia", () => {
    for (const role of ROLES) {
      expect(RECURSOS.some((recurso) => podeVer(role, recurso))).toBe(true);
    }
  });
});
