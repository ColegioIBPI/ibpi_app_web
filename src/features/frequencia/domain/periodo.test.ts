import { describe, expect, it } from "vitest";

import type { Aula, DiarioDeClasse, FrequenciaDiaria } from "@/core/modelo";
import {
  consolidarPeriodo,
  diariosNoPeriodo,
  disciplinasDoPeriodo,
  faltasPorDisciplina,
  periodoDaQuery,
  periodoInvertido,
  resumirPeriodo,
} from "@/features/frequencia/domain/periodo";

const ALUNOS = [
  { matricula: "26007", nome: "Alice Vianna" },
  { matricula: "25047", nome: "Cauã Cananéa" },
];

const lancamento = (
  matricula: string,
  data: string,
  situacao: "presente" | "falta" | "atraso",
): FrequenciaDiaria =>
  ({ matricula, data, situacao, turmaId: "2026-EM1A" }) as FrequenciaDiaria;

describe("consolidarPeriodo", () => {
  it("traz a turma inteira, inclusive quem não tem lançamento", () => {
    // Deixar de fora quem nunca faltou esconderia metade da turma, e é a
    // turma inteira que a coordenação quer ver.
    const linhas = consolidarPeriodo(ALUNOS, [
      lancamento("26007", "2026-09-01", "falta"),
    ]);

    expect(linhas).toHaveLength(2);
    expect(linhas.find((l) => l.matricula === "25047")?.contadores.dias).toBe(0);
  });

  it("conta presenças, faltas e atrasos por aluno", () => {
    const linhas = consolidarPeriodo(ALUNOS, [
      lancamento("26007", "2026-09-01", "presente"),
      lancamento("26007", "2026-09-02", "falta"),
      lancamento("26007", "2026-09-03", "atraso"),
    ]);

    const alice = linhas.find((l) => l.matricula === "26007")!;
    expect(alice.contadores).toEqual({
      presencas: 1,
      faltas: 1,
      atrasos: 1,
      dias: 3,
    });
  });

  it("atraso conta como presença no percentual", () => {
    const linhas = consolidarPeriodo([ALUNOS[0]], [
      lancamento("26007", "2026-09-01", "atraso"),
      lancamento("26007", "2026-09-02", "falta"),
    ]);

    expect(linhas[0].percentual).toBe(0.5);
  });

  it("sem dia registrado o percentual fica em branco, não zero", () => {
    // "0% de presença" no começo do ano assustaria a família à toa.
    expect(consolidarPeriodo(ALUNOS, [])[0].percentual).toBeNull();
  });

  it("ordena por nome", () => {
    expect(consolidarPeriodo(ALUNOS, []).map((l) => l.nome)).toEqual([
      "Alice Vianna",
      "Cauã Cananéa",
    ]);
  });

  it("ignora lançamento de aluno que não está na lista", () => {
    const linhas = consolidarPeriodo([ALUNOS[0]], [
      lancamento("99999", "2026-09-01", "falta"),
    ]);

    expect(linhas).toHaveLength(1);
    expect(linhas[0].contadores.dias).toBe(0);
  });
});

describe("periodoDaQuery", () => {
  const hoje = new Date(2026, 8, 24); // 24/09/2026

  it("sem período, usa o mês corrente", () => {
    expect(periodoDaQuery(undefined, undefined, hoje)).toEqual({
      de: "2026-09-01",
      ate: "2026-09-24",
    });
  });

  it("aceita o período informado", () => {
    expect(periodoDaQuery("2026-03-01", "2026-03-31", hoje)).toEqual({
      de: "2026-03-01",
      ate: "2026-03-31",
    });
  });

  it("ignora data mal formada e volta ao padrão", () => {
    expect(periodoDaQuery("01/03/2026", ["x"], hoje)).toEqual({
      de: "2026-09-01",
      ate: "2026-09-24",
    });
  });
});

describe("periodoInvertido", () => {
  it("aponta o período de trás para frente", () => {
    expect(periodoInvertido({ de: "2026-09-30", ate: "2026-09-01" })).toBe(true);
  });

  it("um único dia não é invertido", () => {
    expect(periodoInvertido({ de: "2026-09-01", ate: "2026-09-01" })).toBe(false);
  });
});

describe("resumirPeriodo", () => {
  it("soma a turma e conta quem está abaixo do mínimo", () => {
    const linhas = consolidarPeriodo(ALUNOS, [
      lancamento("26007", "2026-09-01", "presente"),
      lancamento("26007", "2026-09-02", "presente"),
      lancamento("25047", "2026-09-01", "falta"),
      lancamento("25047", "2026-09-02", "falta"),
    ]);

    const resumo = resumirPeriodo(linhas);

    expect(resumo.alunos).toBe(2);
    expect(resumo.dias).toBe(4);
    expect(resumo.presencas).toBe(2);
    expect(resumo.faltas).toBe(2);
    expect(resumo.percentual).toBe(0.5);
    expect(resumo.abaixoDoMinimo).toBe(1);
  });

  it("quem ainda não tem registro não conta como abaixo do mínimo", () => {
    expect(resumirPeriodo(consolidarPeriodo(ALUNOS, [])).abaixoDoMinimo).toBe(0);
  });
});

describe("faltasPorDisciplina", () => {
  const diario = (
    disciplinaId: string,
    disciplinaNome: string,
    aulas: Partial<Aula>[],
  ) =>
    ({
      disciplinaId,
      disciplinaNome,
      turmaId: "2026-EM1A",
      aulas: aulas.map((a, i) => ({
        numero: i + 1,
        data: a.data ?? "2026-09-01",
        conteudo: null,
        semAula: a.semAula ?? null,
        presencas: a.presencas ?? {},
      })),
    }) as DiarioDeClasse;

  it("conta as faltas do aluno em cada disciplina", () => {
    const linhas = faltasPorDisciplina(
      [
        diario("fisica", "Física", [
          { presencas: { "26007": false } },
          {},
          {},
        ]),
        diario("artes", "Artes", [{}, {}]),
      ],
      "26007",
    );

    expect(linhas).toEqual([
      { disciplinaId: "artes", disciplinaNome: "Artes", aulas: 2, faltas: 0, percentual: 1 },
      {
        disciplinaId: "fisica",
        disciplinaNome: "Física",
        aulas: 3,
        faltas: 1,
        percentual: 2 / 3,
      },
    ]);
  });

  it("dia sem aula não entra na conta", () => {
    // Contá-lo transformaria o recesso em falta de todo mundo.
    const linhas = faltasPorDisciplina(
      [
        diario("fisica", "Física", [
          { presencas: { "26007": false } },
          { semAula: "feriado", presencas: { "26007": false } },
        ]),
      ],
      "26007",
    );

    expect(linhas[0].aulas).toBe(1);
    expect(linhas[0].faltas).toBe(1);
  });

  it("soma os trimestres da mesma disciplina", () => {
    const linhas = faltasPorDisciplina(
      [
        diario("fisica", "Física", [{ presencas: { "26007": false } }]),
        diario("fisica", "Física", [{}, { presencas: { "26007": false } }]),
      ],
      "26007",
    );

    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ aulas: 3, faltas: 2 });
  });

  it("disciplina sem aula no recorte fica de fora", () => {
    // Uma linha "0 de 0" não diz nada e só ocupa o relatório.
    expect(faltasPorDisciplina([diario("fisica", "Física", [])], "26007")).toEqual(
      [],
    );
  });

  it("não confunde alunos", () => {
    const diarios = [
      diario("fisica", "Física", [{ presencas: { "26007": false } }]),
    ];

    expect(faltasPorDisciplina(diarios, "26007")[0].faltas).toBe(1);
    expect(faltasPorDisciplina(diarios, "25047")[0].faltas).toBe(0);
  });
});

describe("diariosNoPeriodo", () => {
  const diario = {
    disciplinaId: "fisica",
    disciplinaNome: "Física",
    turmaId: "2026-EM1A",
    aulas: [
      { numero: 1, data: "2026-08-20", conteudo: null, semAula: null, presencas: {} },
      { numero: 2, data: "2026-09-10", conteudo: null, semAula: null, presencas: {} },
      { numero: 3, data: "2026-10-05", conteudo: null, semAula: null, presencas: {} },
    ],
  } as DiarioDeClasse;

  it("mantém só as aulas dentro do intervalo", () => {
    // O diário é do trimestre; o relatório é de um intervalo de datas.
    const recortado = diariosNoPeriodo([diario], {
      de: "2026-09-01",
      ate: "2026-09-30",
    });

    expect(recortado[0].aulas.map((a) => a.numero)).toEqual([2]);
  });

  it("inclui as pontas do período", () => {
    const recortado = diariosNoPeriodo([diario], {
      de: "2026-08-20",
      ate: "2026-10-05",
    });

    expect(recortado[0].aulas).toHaveLength(3);
  });

  it("não altera o diário recebido", () => {
    diariosNoPeriodo([diario], { de: "2026-09-01", ate: "2026-09-30" });

    expect(diario.aulas).toHaveLength(3);
  });
});

describe("disciplinasDoPeriodo", () => {
  it("lista as disciplinas que aparecem, sem repetir", () => {
    const linhas = [
      {
        matricula: "1",
        nome: "A",
        contadores: { presencas: 0, faltas: 0, atrasos: 0, dias: 0 },
        percentual: null,
        porDisciplina: [
          { disciplinaId: "fisica", disciplinaNome: "Física", aulas: 1, faltas: 0, percentual: 1 },
        ],
      },
      {
        matricula: "2",
        nome: "B",
        contadores: { presencas: 0, faltas: 0, atrasos: 0, dias: 0 },
        percentual: null,
        porDisciplina: [
          { disciplinaId: "fisica", disciplinaNome: "Física", aulas: 1, faltas: 1, percentual: 0 },
          { disciplinaId: "artes", disciplinaNome: "Artes", aulas: 1, faltas: 0, percentual: 1 },
        ],
      },
    ];

    expect(disciplinasDoPeriodo(linhas).map((d) => d.disciplinaNome)).toEqual([
      "Artes",
      "Física",
    ]);
  });
});
