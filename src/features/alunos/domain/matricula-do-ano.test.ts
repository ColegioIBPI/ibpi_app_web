import { describe, expect, it } from "vitest";

import type { Aluno, Matricula } from "@/core/modelo";
import {
  alunosDaTurmaNoAno,
  alunosDoAno,
  camposDaSituacao,
  idDaMatriculaDoAno,
  situacaoDoAno,
  turmaDoAno,
} from "@/features/alunos/domain/matricula-do-ano";

/** O cadastro guarda a turma de **hoje** — depois da virada, a de 2027. */
const CADASTRO = {
  turmaId: "2027-EM3A",
  turmaCodigo: "EM3A",
  serie: "3",
  turno: "manha",
} as Pick<Aluno, "turmaId" | "turmaCodigo" | "serie" | "turno">;

const DE_2026 = {
  turmaId: "2026-EM2A",
  turmaCodigo: "EM2A",
  serie: "2",
  turno: "manha",
} as Pick<Matricula, "turmaId" | "turmaCodigo" | "serie" | "turno">;

describe("a turma daquele ano", () => {
  it("o registro do ano ganha do cadastro", () => {
    // O que faz o boletim de 2026 continuar sendo de 2026 depois da
    // virada. Sem isto ele procuraria alocações de uma turma de 2027
    // dentro de 2026 e sairia sem coluna nenhuma — sem erro na tela.
    expect(turmaDoAno(DE_2026, CADASTRO)).toEqual({
      turmaId: "2026-EM2A",
      turmaCodigo: "EM2A",
      serie: "2",
      turno: "manha",
    });
  });

  it("sem registro do ano, vale o cadastro", () => {
    // O ano em curso, e o aluno criado no portal sem gerar matrícula.
    expect(turmaDoAno(null, CADASTRO).turmaId).toBe("2027-EM3A");
  });

  it("a identificação também é a do ano", () => {
    // A segunda via do boletim de 2026 precisa dizer EM2A, 2ª série —
    // mesmo com o aluno já na EM3A.
    const doAno = turmaDoAno(DE_2026, CADASTRO);

    expect(doAno.turmaCodigo).toBe("EM2A");
    expect(doAno.serie).toBe("2");
  });

  it("cadastro sem turma devolve nulo, não `undefined`", () => {
    expect(
      turmaDoAno(null, {} as Pick<Aluno, "turmaId" | "turmaCodigo" | "serie" | "turno">),
    ).toEqual({ turmaId: null, turmaCodigo: null, serie: null, turno: null });
  });

  it("o id da matrícula é ano e matrícula", () => {
    expect(idDaMatriculaDoAno(2026, "26007")).toBe("2026-26007");
  });
});

describe("quem estava na turma naquele ano", () => {
  const alunos = [
    { matricula: "1", nome: "Alice", turmaId: "2027-EM3A" },
    { matricula: "2", nome: "Bruno", turmaId: "2027-EM3A" },
    { matricula: "3", nome: "Carla", turmaId: "2027-EM1A" },
  ];

  const de2026: Array<Pick<Matricula, "matricula" | "turmaId">> = [
    { matricula: "1", turmaId: "2026-EM2A" },
    { matricula: "2", turmaId: "2026-EM1A" },
  ];

  it("usa o registro do ano, não a turma de hoje", () => {
    // A ata de 2026 tirada em 2027 sairia com os alunos de 2027.
    expect(
      alunosDaTurmaNoAno(alunos, de2026, "2026-EM2A").map((a) => a.nome),
    ).toEqual(["Alice"]);
  });

  it("turma sem ninguém no ano devolve vazio, e não cai no cadastro", () => {
    // Se o ano tem registro, ele manda em tudo. Perguntar turma a turma
    // faria o cadastro responder justamente onde o ano diz "vazio".
    expect(alunosDaTurmaNoAno(alunos, de2026, "2026-EM3A")).toEqual([]);
  });

  it("ano sem registro nenhum usa o cadastro", () => {
    // É o estado do ano em curso, e o do aluno criado no portal.
    expect(
      alunosDaTurmaNoAno(alunos, [], "2027-EM3A").map((a) => a.nome),
    ).toEqual(["Alice", "Bruno"]);
  });

  it("aluno com registro de outra turma não entra", () => {
    expect(
      alunosDaTurmaNoAno(alunos, de2026, "2026-EM1A").map((a) => a.nome),
    ).toEqual(["Bruno"]);
  });

  it("registro de aluno fora do escopo da sessão não traz ninguém a mais", () => {
    // O escopo é aplicado antes: a lista que chega aqui já é a que a
    // pessoa pode ver, e o registro do ano só filtra.
    expect(
      alunosDaTurmaNoAno(
        [alunos[0]],
        [...de2026, { matricula: "99", turmaId: "2026-EM2A" }],
        "2026-EM2A",
      ).map((a) => a.nome),
    ).toEqual(["Alice"]);
  });
});

type RegistroDoAno = Pick<
  Matricula,
  | "matricula"
  | "turmaId"
  | "turmaCodigo"
  | "serie"
  | "turno"
  | "situacao"
  | "dataDaSituacao"
>;

describe("a situação daquele ano", () => {
  const cadastro = {
    situacaoMatricula: "cancelada",
    dataDaSituacao: "2027-03-10",
  } as const;

  it("o registro do ano ganha do cadastro", () => {
    // O aluno cancelou em 2027. Em 2026 ele estudou o ano inteiro, e a
    // ata de 2026 não pode dizer que ele estava cancelado.
    const doAno = situacaoDoAno(
      { situacao: "ativa", dataDaSituacao: null },
      cadastro,
    );

    expect(doAno.situacaoMatricula).toBe("ativa");
    expect(doAno.ativo).toBe(true);
    expect(doAno.dataDaSituacao).toBeNull();
  });

  it("a data vem do mesmo lugar que a situação", () => {
    // Misturar as duas daria "concluída" com a data do cancelamento do
    // ano seguinte — uma data que não é de fato nenhum.
    const doAno = situacaoDoAno(
      { situacao: "concluida", dataDaSituacao: "2026-12-15" },
      cadastro,
    );

    expect(doAno.dataDaSituacao).toBe("2026-12-15");
  });

  it("sem registro do ano, vale o cadastro", () => {
    const doAno = situacaoDoAno(null, cadastro);

    expect(doAno.situacaoMatricula).toBe("cancelada");
    expect(doAno.dataDaSituacao).toBe("2027-03-10");
    expect(doAno.ativo).toBe(false);
  });

  it("registro antigo sem data devolve nulo, não `undefined`", () => {
    // Os 73 registros migrados nasceram antes do campo existir. O
    // Firestore recusa `undefined`, e a planilha imprimiria vazio.
    expect(
      situacaoDoAno({ situacao: "concluida" } as Matricula, {}).dataDaSituacao,
    ).toBeNull();
  });

  it("sem registro e sem cadastro, a matrícula é ativa", () => {
    expect(situacaoDoAno(null, {}).ativo).toBe(true);
  });
});

describe("o que o registro do ano guarda de situação", () => {
  it("matrícula ativa não guarda data", () => {
    // No cadastro este campo vira a data de matrícula. Copiá-la para o
    // registro faria a ata imprimir "transferido em" na linha de quem
    // está estudando.
    expect(
      camposDaSituacao({
        situacaoMatricula: "ativa",
        dataDaSituacao: "2026-01-16",
      }),
    ).toEqual({ situacao: "ativa", dataDaSituacao: null });
  });

  it("matrícula encerrada guarda o dia do fato", () => {
    expect(
      camposDaSituacao({
        situacaoMatricula: "transferida",
        dataDaSituacao: "2026-09-30",
      }),
    ).toEqual({ situacao: "transferida", dataDaSituacao: "2026-09-30" });
  });

  it("encerrada sem data guarda nulo, e não `undefined`", () => {
    // O Firestore recusa `undefined`. A pendência aparece na ata como
    // coluna vazia, que é onde a secretaria a vê.
    expect(
      camposDaSituacao({ situacaoMatricula: "cancelada", dataDaSituacao: null }),
    ).toEqual({ situacao: "cancelada", dataDaSituacao: null });
  });
});

describe("a lista de alunos de um ano", () => {
  /** Cadastro: a turma é a de hoje, 2027. */
  const cadastro = [
    { matricula: "25001", nome: "Alice", turmaId: "2027-EM3A", turmaCodigo: "EM3A", serie: "3", turno: "manha" },
    { matricula: "25002", nome: "Bruno", turmaId: "2027-EM3A", turmaCodigo: "EM3A", serie: "3", turno: "manha" },
    { matricula: "26010", nome: "Carla", turmaId: null, turmaCodigo: null, serie: null, turno: null },
  ] as Array<{
    matricula: string;
    nome: string;
    turmaId: string | null;
    turmaCodigo: string | null;
    serie: string | null;
    turno: Aluno["turno"] | null;
    situacaoMatricula?: Matricula["situacao"];
    dataDaSituacao?: string | null;
  }>;

  const de2026 = [
    { matricula: "25001", turmaId: "2026-EM2A", turmaCodigo: "EM2A", serie: "2", turno: "manha", situacao: "ativa", dataDaSituacao: null },
    { matricula: "25002", turmaId: "2026-EM2A", turmaCodigo: "EM2A", serie: "2", turno: "manha", situacao: "ativa", dataDaSituacao: null },
  ] as RegistroDoAno[];

  it("mostra a turma daquele ano, não a de hoje", () => {
    // A tela de 2026 tirada em 2027 diria EM3A na coluna TURMA.
    const { alunos } = alunosDoAno(cadastro, de2026, 2026);

    const comTurma = alunos.filter((a) => a.turmaCodigo);

    expect(comTurma.map((a) => a.turmaCodigo)).toEqual(["EM2A", "EM2A"]);
    expect(comTurma.map((a) => a.serie)).toEqual(["2", "2"]);
  });

  it("quem não cursou o ano fica de fora, e a tela sabe quantos", () => {
    // Carla entrou em 2026 e tem registro em 2026? Não — ela entra pela
    // exceção do recém-cadastrado, testada abaixo. Aqui o que importa é
    // que ninguém some calado.
    const { alunos, foraDoAno } = alunosDoAno(cadastro, [], 2027);

    expect(alunos).toEqual([]);
    expect(foraDoAno).toBe(3);
  });

  it("o aluno recém-cadastrado sem turma não some da lista", () => {
    // Sem isto a secretaria cadastraria um aluno sem turma e ele
    // desapareceria no mesmo instante — e o jeito de "resolver" seria
    // cadastrá-lo de novo, com outra matrícula.
    const { alunos, foraDoAno } = alunosDoAno(cadastro, de2026, 2026);

    expect(alunos.map((a) => a.matricula)).toContain("26010");
    expect(foraDoAno).toBe(0);
  });

  it("o recém-cadastrado só aparece no ano em que entrou", () => {
    // Carla entrou em 2026: em 2027 ela só aparece se for passada.
    const { alunos } = alunosDoAno(cadastro, [], 2026);

    expect(alunos.map((a) => a.matricula)).toEqual(["26010"]);
  });

  it("matrícula fora do padrão não entra em ano nenhum", () => {
    // `QA-0001` não diz em que ano entrou. Sai na conta de `foraDoAno`,
    // que é o que a tela mostra.
    const { alunos, foraDoAno } = alunosDoAno(
      [{ matricula: "QA-0001", nome: "Teste" }],
      [],
      2026,
    );

    expect(alunos).toEqual([]);
    expect(foraDoAno).toBe(1);
  });

  it("ano aberto e ainda sem ninguém devolve lista vazia", () => {
    // O estado normal logo depois de copiar a estrutura do ano novo: a
    // tela precisa dizer "nenhum aluno em 2027", e não mostrar os de 2026.
    const { alunos } = alunosDoAno(cadastro.slice(0, 2), [], 2027);

    expect(alunos).toEqual([]);
  });

  it("não altera o cadastro recebido", () => {
    alunosDoAno(cadastro, de2026, 2026);

    expect(cadastro[0].turmaCodigo).toBe("EM3A");
  });

  it("traz a situação daquele ano, não a de hoje", () => {
    // A Alice cancelou em 2027. A ata de 2026 e a contagem da turma
    // precisam dela como ativa: ela cursou 2026 inteiro.
    const hoje = [
      { ...cadastro[0], situacaoMatricula: "cancelada" as const, dataDaSituacao: "2027-03-10" },
    ];

    const { alunos } = alunosDoAno(hoje, de2026, 2026);

    expect(alunos[0].situacaoMatricula).toBe("ativa");
    expect(alunos[0].dataDaSituacao).toBeNull();
  });

  it("quem concluiu no ano sai como concluído naquele ano", () => {
    const concluida = [
      { ...de2026[0], situacao: "concluida" as const, dataDaSituacao: "2026-12-15" },
    ];

    const { alunos } = alunosDoAno([cadastro[0]], concluida, 2026);

    expect(alunos[0].situacaoMatricula).toBe("concluida");
    expect(alunos[0].dataDaSituacao).toBe("2026-12-15");
  });
});
