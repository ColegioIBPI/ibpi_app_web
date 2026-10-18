import { describe, expect, it } from "vitest";

import type { SituacaoDaMatricula } from "@/core/modelo";
import {
  dataDoStatus,
  dataQueVale,
  ehMatriculaAtiva,
  exigeDataPropria,
  normalizarSituacao,
  situacaoDoMigrado,
} from "@/features/alunos/domain/situacao";

const TODAS: SituacaoDaMatricula[] = [
  "ativa",
  "cancelada",
  "concluida",
  "transferida",
  "abandono",
];

const ENCERRADAS = TODAS.filter((s) => s !== "ativa");

describe("ativo deriva da situação", () => {
  it("só a matrícula ativa deixa o aluno nas listagens", () => {
    // Metade do sistema consulta `where("ativo", "==", true)`. Se os dois
    // fossem editados à mão, um aluno transferido continuaria na chamada.
    expect(normalizarSituacao({ situacaoMatricula: "ativa" }).ativo).toBe(true);

    for (const situacao of ENCERRADAS) {
      expect(normalizarSituacao({ situacaoMatricula: situacao }).ativo).toBe(
        false,
      );
    }
  });

  it("ehMatriculaAtiva concorda com o que foi normalizado", () => {
    for (const situacao of TODAS) {
      expect(ehMatriculaAtiva(situacao)).toBe(
        normalizarSituacao({ situacaoMatricula: situacao }).ativo,
      );
    }
  });
});

describe("a data da situação", () => {
  it("com matrícula ativa, é a data de matrícula", () => {
    const dados = {
      situacaoMatricula: "ativa" as const,
      dataMatricula: "2026-02-03",
    };

    expect(dataQueVale(dados)).toBe("2026-02-03");
  });

  it("com matrícula ativa, ignora a data que o formulário mandou", () => {
    // "Ativo desde outro dia" não significa nada, e aceitar o valor
    // deixaria as duas datas divergindo em silêncio.
    const dados = {
      situacaoMatricula: "ativa" as const,
      dataMatricula: "2026-02-03",
      dataDaSituacao: "2026-09-30",
    };

    expect(dataQueVale(dados)).toBe("2026-02-03");
    expect(normalizarSituacao(dados).dataDaSituacao).toBe("2026-02-03");
  });

  it("encerrada, é a data do fato", () => {
    for (const situacao of ENCERRADAS) {
      expect(
        dataQueVale({
          situacaoMatricula: situacao,
          dataMatricula: "2026-02-03",
          dataDaSituacao: "2026-07-15",
        }),
      ).toBe("2026-07-15");
    }
  });

  it("encerrada sem data informada fica nula, não vira hoje", () => {
    // Inventar a data do cancelamento é inventar um fato sobre o aluno. A
    // tela mostra a pendência; o banco não guarda uma mentira.
    expect(
      dataQueVale({
        situacaoMatricula: "transferida",
        dataMatricula: "2026-02-03",
      }),
    ).toBeNull();
  });

  it("só a situação encerrada pede data própria", () => {
    expect(exigeDataPropria("ativa")).toBe(false);

    for (const situacao of ENCERRADAS) {
      expect(exigeDataPropria(situacao)).toBe(true);
    }
  });
});

describe("cadastro migrado do Access", () => {
  it("ex-aluno vira cancelada, não abandono nem transferida", () => {
    // Entre as três, cancelada é a que afirma menos: dizer que alguém
    // abandonou a escola sem ter esse registro seria inventar um fato sobre
    // uma pessoa.
    expect(situacaoDoMigrado(false)).toBe("cancelada");
    expect(situacaoDoMigrado(true)).toBe("ativa");
  });
});

describe("data do status — ata de matrículas", () => {
  it("fica em branco para quem está ativo", () => {
    // A data da matrícula já está na coluna ao lado; repeti-la faria
    // parecer que todo aluno teve mudança de situação.
    expect(
      dataDoStatus({
        situacaoMatricula: "ativa",
        dataMatricula: "2026-01-16",
        dataDaSituacao: "2026-05-10",
      }),
    ).toBeNull();
  });

  it("traz a data quando o status mudou", () => {
    for (const situacao of ["cancelada", "transferida", "concluida", "abandono"] as const) {
      expect(
        dataDoStatus({
          situacaoMatricula: situacao,
          dataMatricula: "2026-01-16",
          dataDaSituacao: "2026-05-10",
        }),
      ).toBe("2026-05-10");
    }
  });

  it("cancelado sem data devolve null, e não a da matrícula", () => {
    // Os 11 migrados do Access não têm a data — o sistema antigo guardava
    // o status e não a data. Cair na data de matrícula inventaria um
    // cancelamento no dia em que o aluno entrou.
    expect(
      dataDoStatus({
        situacaoMatricula: "cancelada",
        dataMatricula: "2026-01-16",
        dataDaSituacao: null,
      }),
    ).toBeNull();
  });
});
