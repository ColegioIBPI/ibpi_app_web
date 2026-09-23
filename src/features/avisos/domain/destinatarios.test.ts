import { describe, expect, it } from "vitest";

import { chaveDoDestino, type Destino } from "@/core/modelo";
import {
  avisoEhPara,
  chavesDoDestinatario,
  destinosPermitidos,
  lotesDeChaves,
  podePublicarPara,
  type ContextoDoDestinatario,
} from "@/features/avisos/domain/destinatarios";

const aluno: ContextoDoDestinatario = {
  role: "aluno",
  matricula: "26007",
  turmas: ["2026-EM1A"],
  segmentos: ["medio"],
};

const responsavel: ContextoDoDestinatario = {
  role: "responsavel",
  alunosVinculados: ["26007", "25047"],
  responsavelId: "email-mae-x-com",
  turmas: ["2026-EM1A", "2026-EM3A"],
  segmentos: ["medio"],
};

const professor: ContextoDoDestinatario = {
  role: "professor",
  turmas: ["2026-EM1A"],
  segmentos: ["medio"],
};

describe("chavesDoDestinatario", () => {
  it("todo mundo recebe o aviso geral", () => {
    for (const contexto of [aluno, responsavel, professor]) {
      expect(chavesDoDestinatario(contexto)).toContain("todos");
    }
  });

  it("aluno recebe o próprio, o da turma e o do segmento", () => {
    expect(chavesDoDestinatario(aluno).sort()).toEqual([
      "aluno:26007",
      "segmento:medio",
      "todos",
      "turma:2026-EM1A",
    ]);
  });

  it("responsável recebe o que foi para ele e o que foi para cada filho", () => {
    // Quem avisa "o aluno tal faltou" espera que a família leia.
    const chaves = chavesDoDestinatario(responsavel);

    expect(chaves).toContain("aluno:26007");
    expect(chaves).toContain("aluno:25047");
    expect(chaves).toContain("responsavel:email-mae-x-com");
    expect(chaves).toContain("turma:2026-EM1A");
    expect(chaves).toContain("turma:2026-EM3A");
  });

  it("aluno não recebe aviso endereçado a responsável", () => {
    expect(chavesDoDestinatario(aluno)).not.toContain(
      "responsavel:email-mae-x-com",
    );
  });

  it("não vaza aviso de outro aluno", () => {
    expect(chavesDoDestinatario(aluno)).not.toContain("aluno:25047");
    expect(chavesDoDestinatario(aluno)).not.toContain("turma:2026-EM3A");
  });

  it("não repete chave", () => {
    const chaves = chavesDoDestinatario({
      ...responsavel,
      turmas: ["2026-EM1A", "2026-EM1A"],
    });

    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("funciona com contexto vazio, sem quebrar", () => {
    expect(chavesDoDestinatario({ role: "secretaria" })).toEqual(["todos"]);
  });
});

describe("avisoEhPara — casa com a chave gravada no aviso", () => {
  const destinoDaTurma: Destino = {
    tipo: "turma",
    turmaId: "2026-EM1A",
    turmaCodigo: "EM1A",
  };
  const destinoDeOutraTurma: Destino = {
    tipo: "turma",
    turmaId: "2026-EF9A",
    turmaCodigo: "EF9A",
  };

  it("aceita o aviso da turma do aluno", () => {
    expect(avisoEhPara(chaveDoDestino(destinoDaTurma), aluno)).toBe(true);
  });

  it("recusa o aviso de outra turma", () => {
    expect(avisoEhPara(chaveDoDestino(destinoDeOutraTurma), aluno)).toBe(false);
  });

  it("aceita o aviso individual do próprio aluno", () => {
    const destino: Destino = {
      tipo: "aluno",
      matricula: "26007",
      nome: "Alice",
    };
    expect(avisoEhPara(chaveDoDestino(destino), aluno)).toBe(true);
    expect(avisoEhPara(chaveDoDestino(destino), responsavel)).toBe(true);
  });

  it("recusa o aviso individual de um colega", () => {
    const destino: Destino = {
      tipo: "aluno",
      matricula: "99999",
      nome: "Outro",
    };
    expect(avisoEhPara(chaveDoDestino(destino), aluno)).toBe(false);
    expect(avisoEhPara(chaveDoDestino(destino), responsavel)).toBe(false);
  });
});

describe("lotesDeChaves", () => {
  it("divide no limite do operador `in` do Firestore", () => {
    const chaves = Array.from({ length: 65 }, (_, i) => `turma:${i}`);
    const lotes = lotesDeChaves(chaves);

    expect(lotes).toHaveLength(3);
    expect(lotes.every((lote) => lote.length <= 30)).toBe(true);
    expect(lotes.flat()).toHaveLength(65);
  });

  it("nunca devolve lote vazio, que viraria consulta inválida", () => {
    expect(lotesDeChaves([])).toEqual([["todos"]]);
  });
});

describe("podePublicarPara — permissão diz o quê, escopo diz para quem", () => {
  const turma: Destino = {
    tipo: "turma",
    turmaId: "2026-EM1A",
    turmaCodigo: "EM1A",
  };
  const outraTurma: Destino = {
    tipo: "turma",
    turmaId: "2026-EF9A",
    turmaCodigo: "EF9A",
  };
  const todos: Destino = { tipo: "todos" };

  it("secretaria e coordenação publicam para qualquer destino", () => {
    for (const role of ["secretaria", "coordenacao"] as const) {
      expect(podePublicarPara(role, todos).ok).toBe(true);
      expect(podePublicarPara(role, outraTurma).ok).toBe(true);
    }
  });

  it("professor publica só para as turmas que leciona", () => {
    expect(podePublicarPara("professor", turma, ["2026-EM1A"]).ok).toBe(true);

    const recusa = podePublicarPara("professor", outraTurma, ["2026-EM1A"]);
    expect(recusa.ok).toBe(false);
    expect(recusa.erro).toContain("EF9A");
  });

  it("professor não publica para a escola inteira", () => {
    expect(podePublicarPara("professor", todos, ["2026-EM1A"]).ok).toBe(false);
  });

  it("financeiro publica para responsável ou aluno, não para todos", () => {
    expect(
      podePublicarPara("financeiro", {
        tipo: "responsavel",
        responsavelId: "x",
        nome: "Mãe",
      }).ok,
    ).toBe(true);
    expect(podePublicarPara("financeiro", todos).ok).toBe(false);
    expect(podePublicarPara("financeiro", turma).ok).toBe(false);
  });

  it("aluno e responsável não publicam", () => {
    expect(podePublicarPara("aluno", todos).ok).toBe(false);
    expect(podePublicarPara("responsavel", todos).ok).toBe(false);
  });
});

describe("destinosPermitidos", () => {
  it("oferece na tela só o que o perfil pode escolher", () => {
    expect(destinosPermitidos("secretaria")).toHaveLength(5);
    expect(destinosPermitidos("professor")).toEqual(["turma", "aluno"]);
    expect(destinosPermitidos("financeiro")).toEqual(["responsavel", "aluno"]);
    expect(destinosPermitidos("aluno")).toEqual([]);
  });

  it("o que a tela oferece é sempre o que a ação aceita", () => {
    // Se divergirem, a pessoa escolhe uma opção e leva um erro depois.
    const destinos: Record<string, Destino> = {
      todos: { tipo: "todos" },
      segmento: { tipo: "segmento", segmento: "medio" },
      turma: { tipo: "turma", turmaId: "2026-EM1A", turmaCodigo: "EM1A" },
      aluno: { tipo: "aluno", matricula: "26007", nome: "Alice" },
      responsavel: { tipo: "responsavel", responsavelId: "x", nome: "Mãe" },
    };

    for (const role of [
      "secretaria",
      "coordenacao",
      "professor",
      "financeiro",
    ] as const) {
      for (const tipo of destinosPermitidos(role)) {
        expect(podePublicarPara(role, destinos[tipo], ["2026-EM1A"]).ok).toBe(
          true,
        );
      }
    }
  });
});
