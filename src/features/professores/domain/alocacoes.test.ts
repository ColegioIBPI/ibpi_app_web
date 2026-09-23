import { describe, expect, it } from "vitest";

import type { Alocacao } from "@/core/modelo";
import {
  disciplinasNaTurma,
  filtrarProfessores,
  idDaAlocacao,
  motivoParaNaoCriarAcesso,
  turmasDasAlocacoes,
  verificarDuplicata,
  type ProfessorDaListagem,
} from "@/features/professores/domain/alocacoes";

const alocacoes = [
  { turmaId: "2026-EM1A", disciplinaId: "fisica" },
  { turmaId: "2026-EM1A", disciplinaId: "matematica" },
  { turmaId: "2026-EM2A", disciplinaId: "fisica" },
];

describe("idDaAlocacao", () => {
  it("é determinístico: alocar de novo sobrescreve, não duplica", () => {
    // Duplicata apareceria como a mesma disciplina repetida no diário.
    const a = idDaAlocacao(2026, "prof-1", "2026-EM1A", "fisica");
    const b = idDaAlocacao(2026, "prof-1", "2026-EM1A", "fisica");

    expect(a).toBe(b);
    expect(a).toBe("2026-prof-1-2026-EM1A-fisica");
  });

  it("separa disciplina, turma e ano", () => {
    const base = idDaAlocacao(2026, "prof-1", "2026-EM1A", "fisica");

    expect(base).not.toBe(idDaAlocacao(2026, "prof-1", "2026-EM1A", "quimica"));
    expect(base).not.toBe(idDaAlocacao(2026, "prof-1", "2026-EM2A", "fisica"));
    expect(base).not.toBe(idDaAlocacao(2027, "prof-1", "2026-EM1A", "fisica"));
  });
});

describe("turmasDasAlocacoes — é o escopo de acesso do professor", () => {
  it("devolve as turmas distintas, ordenadas", () => {
    expect(turmasDasAlocacoes(alocacoes)).toEqual(["2026-EM1A", "2026-EM2A"]);
  });

  it("não conta alocação inativa", () => {
    // Tirar o professor da turma precisa tirar o acesso junto, senão o
    // escopo continua valendo depois de ele deixar de dar aula ali.
    const comInativa = [
      ...alocacoes,
      { turmaId: "2026-EF9A", disciplinaId: "fisica", ativa: false },
    ];

    expect(turmasDasAlocacoes(comInativa)).not.toContain("2026-EF9A");
  });

  it("professor sem alocação não enxerga turma nenhuma", () => {
    expect(turmasDasAlocacoes([])).toEqual([]);
  });
});

describe("disciplinasNaTurma", () => {
  it("lista o que o professor dá naquela turma", () => {
    expect(disciplinasNaTurma(alocacoes, "2026-EM1A")).toEqual([
      "fisica",
      "matematica",
    ]);
    expect(disciplinasNaTurma(alocacoes, "2026-EM2A")).toEqual(["fisica"]);
  });

  it("devolve vazio para turma em que ele não leciona", () => {
    expect(disciplinasNaTurma(alocacoes, "2026-EF9A")).toEqual([]);
  });
});

describe("verificarDuplicata", () => {
  const existentes = [
    {
      anoLetivo: 2026,
      turmaId: "2026-EM1A",
      turmaCodigo: "EM1A",
      disciplinaId: "fisica",
      disciplinaNome: "Física",
      professorId: "p1",
      ativa: true,
      origem: "portal",
    },
  ] as Alocacao[];

  it("avisa quando a combinação já existe, dizendo qual", () => {
    const conflito = verificarDuplicata(existentes, {
      anoLetivo: 2026,
      turmaId: "2026-EM1A",
      disciplinaId: "fisica",
    });

    expect(conflito.ok).toBe(false);
    expect(conflito.erro).toContain("Física");
    expect(conflito.erro).toContain("EM1A");
  });

  it("aceita a mesma disciplina em outra turma", () => {
    expect(
      verificarDuplicata(existentes, {
        anoLetivo: 2026,
        turmaId: "2026-EM2A",
        disciplinaId: "fisica",
      }).ok,
    ).toBe(true);
  });

  it("aceita repetir no ano seguinte", () => {
    expect(
      verificarDuplicata(existentes, {
        anoLetivo: 2027,
        turmaId: "2026-EM1A",
        disciplinaId: "fisica",
      }).ok,
    ).toBe(true);
  });

  it("ignora alocação inativa ao checar duplicata", () => {
    const inativas = existentes.map((a) => ({ ...a, ativa: false }));

    expect(
      verificarDuplicata(inativas, {
        anoLetivo: 2026,
        turmaId: "2026-EM1A",
        disciplinaId: "fisica",
      }).ok,
    ).toBe(true);
  });
});

describe("filtrarProfessores", () => {
  const lista: ProfessorDaListagem[] = [
    {
      nome: "Juarez de Almeida",
      email: "juarez@ibpi.com.br",
      uid: "uid-juarez",
      turmas: ["2026-EM1A"],
      ativo: true,
    },
    {
      nome: "Lúcia Ferreira",
      email: null,
      uid: null,
      turmas: [],
      ativo: true,
    },
    {
      nome: "Antigo Professor",
      email: "antigo@ibpi.com.br",
      uid: null,
      turmas: [],
      ativo: false,
    },
  ];

  it("mostra só os ativos por padrão", () => {
    expect(filtrarProfessores(lista)).toHaveLength(2);
  });

  it("busca por nome sem acento e por e-mail", () => {
    expect(filtrarProfessores(lista, { termo: "lucia" })).toHaveLength(1);
    expect(filtrarProfessores(lista, { termo: "juarez@" })).toHaveLength(1);
  });

  it("encontra quem ainda não tem acesso", () => {
    const semAcesso = filtrarProfessores(lista, { semAcesso: true });
    expect(semAcesso.map((p) => p.nome)).toEqual(["Lúcia Ferreira"]);
  });
});

describe("motivoParaNaoCriarAcesso", () => {
  const base: ProfessorDaListagem = {
    nome: "Juarez",
    email: "juarez@ibpi.com.br",
    uid: null,
    turmas: [],
    ativo: true,
  };

  it("permite criar acesso mesmo sem alocação", () => {
    // Diferente do responsável: o professor precisa entrar para ver o
    // próprio cadastro, e a grade do ano costuma fechar depois.
    expect(motivoParaNaoCriarAcesso(base)).toBeNull();
  });

  it("exige e-mail", () => {
    expect(motivoParaNaoCriarAcesso({ ...base, email: null })).toMatch(
      /e-mail/i,
    );
  });

  it("recusa quem já tem conta", () => {
    expect(motivoParaNaoCriarAcesso({ ...base, uid: "x" })).toMatch(/já tem/i);
  });

  it("recusa professor inativo", () => {
    expect(motivoParaNaoCriarAcesso({ ...base, ativo: false })).toMatch(
      /reative/i,
    );
  });
});
