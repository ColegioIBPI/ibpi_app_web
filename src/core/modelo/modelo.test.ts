import { describe, expect, it } from "vitest";

import {
  alunoNovoSchema,
  alunoSchema,
  boletimSchema,
  cobrancaSchema,
  COLECOES,
  diaDeAulaSchema,
  frequenciaDiariaSchema,
  notaSchema,
  professorSchema,
  responsavelSchema,
  turmaSchema,
} from "@/core/modelo";

/**
 * Testes do modelo: garantem que o esquema recusa o que não pode entrar no
 * banco e aceita o que a base real tem.
 */

const alunoValido = {
  matricula: "26007",
  nome: "Alice Vianna Fernandes",
  contato: { emails: [], telefones: [], endereco: {} },
  filiacao: {},
  documentos: {},
};

describe("alunoSchema", () => {
  it("aceita o mínimo: matrícula e nome", () => {
    const resultado = alunoSchema.safeParse(alunoValido);
    expect(resultado.success).toBe(true);
    // Aluno nasce ativo; inativo é o ex-aluno.
    expect(resultado.success && resultado.data.ativo).toBe(true);
  });

  it("recusa nome curto demais para ser um nome", () => {
    const resultado = alunoSchema.safeParse({ ...alunoValido, nome: "Al" });
    expect(resultado.success).toBe(false);
  });

  it("recusa CPF fora do formato de 11 dígitos", () => {
    expect(
      alunoSchema.safeParse({ ...alunoValido, cpf: "017.194.250-78" }).success,
    ).toBe(false);
    expect(
      alunoSchema.safeParse({ ...alunoValido, cpf: "01719425078" }).success,
    ).toBe(true);
  });

  it("recusa data fora do formato AAAA-MM-DD", () => {
    expect(
      alunoSchema.safeParse({ ...alunoValido, dataNascimento: "11/03/2008" })
        .success,
    ).toBe(false);
    expect(
      alunoSchema.safeParse({ ...alunoValido, dataNascimento: "2008-03-11" })
        .success,
    ).toBe(true);
  });

  it("recusa e-mail inválido na lista de contato", () => {
    expect(
      alunoSchema.safeParse({
        ...alunoValido,
        contato: { emails: ["não é e-mail"], telefones: [], endereco: {} },
      }).success,
    ).toBe(false);
  });

  it("guarda null em vez de string vazia", () => {
    const resultado = alunoSchema.parse({
      ...alunoValido,
      observacoes: "   ",
    });
    expect(resultado.observacoes).toBeNull();
  });

  it("normaliza a UF para maiúsculas", () => {
    const resultado = alunoSchema.parse({
      ...alunoValido,
      contato: { emails: [], telefones: [], endereco: { uf: "rj" } },
    });
    expect(resultado.contato.endereco.uf).toBe("RJ");
  });
});

describe("alunoNovoSchema", () => {
  it("exige a matrícula na criação", () => {
    const { matricula, ...semMatricula } = alunoValido;
    void matricula;
    expect(alunoNovoSchema.safeParse(semMatricula).success).toBe(false);
  });
});

describe("turmaSchema", () => {
  it("aceita as turmas que existem hoje", () => {
    for (const codigo of ["EM1A", "EF9A", "E.J.A. EM", "6/7ºEF"]) {
      expect(
        turmaSchema.safeParse({
          codigo,
          anoLetivo: 2026,
          segmento: "medio",
          turno: "manha",
        }).success,
      ).toBe(true);
    }
  });

  it("recusa segmento que não existe no colégio", () => {
    expect(
      turmaSchema.safeParse({
        codigo: "EI1A",
        anoLetivo: 2026,
        segmento: "infantil",
        turno: "manha",
      }).success,
    ).toBe(false);
  });
});

describe("notaSchema", () => {
  const base = {
    anoLetivo: 2026,
    trimestre: 1,
    matricula: "26007",
    turmaId: "2026-EM1A",
    disciplinaId: "matematica",
    avaliacoes: { projeto: 7.8, tarefas: 10, av: 7.6 },
  };

  it("aceita o lançamento das três avaliações do trimestre", () => {
    expect(notaSchema.safeParse(base).success).toBe(true);
  });

  it("aceita avaliação ainda não lançada", () => {
    expect(
      notaSchema.safeParse({
        ...base,
        avaliacoes: { projeto: null, tarefas: null, av: null },
      }).success,
    ).toBe(true);
  });

  it("recusa nota fora da escala de 0 a 10", () => {
    expect(
      notaSchema.safeParse({
        ...base,
        avaliacoes: { ...base.avaliacoes, av: 11 },
      }).success,
    ).toBe(false);
    expect(
      notaSchema.safeParse({
        ...base,
        avaliacoes: { ...base.avaliacoes, av: -1 },
      }).success,
    ).toBe(false);
  });

  it("recusa trimestre que não existe — o colégio tem três", () => {
    expect(notaSchema.safeParse({ ...base, trimestre: 4 }).success).toBe(false);
  });
});

describe("frequenciaDiariaSchema", () => {
  const base = {
    data: "2026-03-27",
    matricula: "26007",
    turmaId: "2026-EM1A",
    situacao: "falta",
  };

  it("aceita as três marcações da planilha", () => {
    for (const situacao of ["presente", "falta", "atraso"]) {
      expect(
        frequenciaDiariaSchema.safeParse({ ...base, situacao }).success,
      ).toBe(true);
    }
  });

  it("aceita ocorrência junto da marcação", () => {
    expect(
      frequenciaDiariaSchema.safeParse({
        ...base,
        ocorrencia: "porte-indevido-de-celular",
        observacao: "Terceira ocorrência no mês",
      }).success,
    ).toBe(true);
  });

  it("recusa tipo de ocorrência inventado", () => {
    expect(
      frequenciaDiariaSchema.safeParse({ ...base, ocorrencia: "qualquer" })
        .success,
    ).toBe(false);
  });
});

describe("cobrancaSchema", () => {
  it("aceita a parcela como vem do Access", () => {
    expect(
      cobrancaSchema.safeParse({
        matricula: "26002",
        vencimento: "2026-03-10",
        parcela: 3,
        totalDeParcelas: 12,
        valor: 1603,
        valorPago: 1603,
        dataPagamento: "2026-03-10",
        emitidaPeloBanco: true,
        emitidaPeloColegio: false,
      }).success,
    ).toBe(true);
  });

  it("aceita parcela em aberto, sem pagamento", () => {
    expect(
      cobrancaSchema.safeParse({
        matricula: "26002",
        vencimento: "2026-03-10",
        valor: 1603,
        valorPago: null,
        dataPagamento: null,
      }).success,
    ).toBe(true);
  });

  it("não guarda a situação da parcela", () => {
    // "Vencida" é uma conclusão sobre hoje: gravada, ela envelhece. Ver
    // `features/financeiro/domain/cobranca.ts`.
    const parcela = cobrancaSchema.parse({
      matricula: "26002",
      vencimento: "2026-03-10",
      valor: 1603,
      valorPago: null,
      situacao: "paga",
    });

    expect(parcela).not.toHaveProperty("situacao");
  });

  it("exige matrícula e vencimento", () => {
    expect(
      cobrancaSchema.safeParse({ valor: 100, valorPago: null }).success,
    ).toBe(false);
  });
});

describe("modelo das coleções ainda vazias", () => {
  it("professor tem os campos da tabela de origem", () => {
    expect(
      professorSchema.safeParse({
        nome: "Juarez de Almeida",
        cpf: "01719425078",
        email: "juarez@ibpi.com.br",
        turmas: ["2026-EM1A"],
      }).success,
    ).toBe(true);
  });

  it("dia de aula exige horário em HH:MM", () => {
    expect(
      diaDeAulaSchema.safeParse({
        turmaId: "2026-EM1A",
        diaDaSemana: 1,
        horaInicio: "07:30",
        horaFim: "12:00",
      }).success,
    ).toBe(true);

    expect(
      diaDeAulaSchema.safeParse({
        turmaId: "2026-EM1A",
        diaDaSemana: 1,
        horaInicio: "7h30",
        horaFim: "12:00",
      }).success,
    ).toBe(false);
  });

  it("boletim comporta os quatro blocos da planilha", () => {
    const resultado = boletimSchema.safeParse({
      anoLetivo: 2026,
      matricula: "26007",
      turmaId: "2026-EM1A",
      disciplinas: [
        {
          disciplinaId: "portugues-literatura",
          disciplinaNome: "Português/Literatura",
          trimestres: { "1": { projeto: 7.8, tarefas: 10, av: 7.6 } },
        },
      ],
      projetoBilingue: {
        nivel: "N2",
        componentes: [{ nome: "ENGLISH", trimestres: { "1": 9.5 } }],
      },
      eletivas: [{ nome: "Francês", periodo: "2026.02" }],
      dependencias: [
        {
          disciplinaId: "matematica",
          disciplinaNome: "Matemática",
          tipo: "dependencia",
          p1: 6,
          p2: 7,
        },
      ],
    });

    expect(resultado.success).toBe(true);
  });
});

describe("responsavelSchema", () => {
  it("guarda os filhos vinculados, que definem o escopo de acesso", () => {
    const resultado = responsavelSchema.parse({
      nome: "Sharisy Colavitti Antunes",
      email: "sharisy09@gmail.com",
      alunosVinculados: ["23016", "23017"],
    });

    expect(resultado.alunosVinculados).toEqual(["23016", "23017"]);
  });

  it("começa sem filho vinculado em vez de undefined", () => {
    expect(
      responsavelSchema.parse({ nome: "Renata Gobato" }).alunosVinculados,
    ).toEqual([]);
  });
});

describe("COLECOES", () => {
  it("não tem nome repetido", () => {
    const nomes = Object.values(COLECOES);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});
