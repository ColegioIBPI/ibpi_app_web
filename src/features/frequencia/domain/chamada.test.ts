import { describe, expect, it } from "vitest";

import {
  idDoLancamento,
  linhasParaGravar,
  montarChamada,
  resumoDaChamada,
  type LinhaDaChamada,
} from "@/features/frequencia/domain/chamada";

const alunos = [
  { matricula: "26007", nome: "Alice Vianna" },
  { matricula: "25047", nome: "Cauã Cananéa" },
  { matricula: "24001", nome: "Tiago Lopes" },
];

describe("montarChamada", () => {
  it("começa todo mundo presente, que é o caso da maioria", () => {
    // Exigir um clique por aluno presente tornaria a chamada mais lenta que
    // o papel que ela substitui.
    const linhas = montarChamada(alunos, []);

    expect(linhas).toHaveLength(3);
    expect(linhas.every((l) => l.situacao === "presente")).toBe(true);
    expect(linhas.every((l) => !l.jaLancado)).toBe(true);
  });

  it("traz o que já foi lançado no dia", () => {
    const linhas = montarChamada(alunos, [
      {
        matricula: "25047",
        situacao: "falta",
        ocorrencia: "atestado-medico",
        observacao: "Entregou atestado",
      },
    ]);

    const caua = linhas.find((l) => l.matricula === "25047")!;
    expect(caua.situacao).toBe("falta");
    expect(caua.ocorrencia).toBe("atestado-medico");
    expect(caua.observacao).toBe("Entregou atestado");
    expect(caua.jaLancado).toBe(true);
  });

  it("mantém a ordem dos alunos, não a dos lançamentos", () => {
    const linhas = montarChamada(alunos, [
      { matricula: "24001", situacao: "falta" },
    ]);

    expect(linhas.map((l) => l.matricula)).toEqual(["26007", "25047", "24001"]);
  });

  it("ignora lançamento de aluno que não está na turma", () => {
    const linhas = montarChamada(alunos, [
      { matricula: "99999", situacao: "falta" },
    ]);

    expect(linhas).toHaveLength(3);
  });
});

describe("idDoLancamento", () => {
  it("é um por aluno por dia, e determinístico", () => {
    // Refazer a chamada corrige o registro em vez de criar um segundo.
    expect(idDoLancamento("2026-03-27", "26007")).toBe("2026-03-27-26007");
    expect(idDoLancamento("2026-03-27", "26007")).toBe(
      idDoLancamento("2026-03-27", "26007"),
    );
  });

  it("separa dias e alunos diferentes", () => {
    expect(idDoLancamento("2026-03-27", "26007")).not.toBe(
      idDoLancamento("2026-03-28", "26007"),
    );
    expect(idDoLancamento("2026-03-27", "26007")).not.toBe(
      idDoLancamento("2026-03-27", "25047"),
    );
  });
});

describe("linhasParaGravar", () => {
  const originais = montarChamada(alunos, [
    { matricula: "25047", situacao: "falta" },
  ]);

  it("não grava a turma inteira quando nada mudou", () => {
    // Gravar tudo encheria a auditoria de "presente → presente".
    expect(linhasParaGravar(originais, originais)).toEqual([]);
  });

  it("grava só quem teve a marcação alterada", () => {
    const atuais = originais.map((linha) =>
      linha.matricula === "26007"
        ? { ...linha, situacao: "atraso" as const }
        : linha,
    );

    const gravar = linhasParaGravar(atuais, originais);
    expect(gravar).toHaveLength(1);
    expect(gravar[0].matricula).toBe("26007");
  });

  it("não cria documento para aluno presente sem nada a registrar", () => {
    // 73 documentos por dia sem informação nenhuma.
    const atuais = montarChamada(alunos, []);
    expect(linhasParaGravar(atuais, atuais)).toEqual([]);
  });

  it("grava aluno presente que ganhou ocorrência", () => {
    const atuais = montarChamada(alunos, []).map((linha) =>
      linha.matricula === "24001"
        ? { ...linha, ocorrencia: "uniforme" as const }
        : linha,
    );

    const gravar = linhasParaGravar(atuais, montarChamada(alunos, []));
    expect(gravar.map((l) => l.matricula)).toEqual(["24001"]);
  });

  it("grava a correção que volta ao padrão", () => {
    // Quem foi marcado falta por engano precisa voltar a presente — e isso
    // é uma alteração de verdade, que tem de ser gravada.
    const atuais = originais.map((linha) =>
      linha.matricula === "25047"
        ? { ...linha, situacao: "presente" as const }
        : linha,
    );

    expect(linhasParaGravar(atuais, originais).map((l) => l.matricula)).toEqual(
      ["25047"],
    );
  });

  it("ignora diferença só de espaço na observação", () => {
    const atuais = originais.map((linha) =>
      linha.matricula === "25047" ? { ...linha, observacao: "  " } : linha,
    );

    expect(linhasParaGravar(atuais, originais)).toEqual([]);
  });
});

describe("resumoDaChamada", () => {
  it("conta o dia para o cabeçalho", () => {
    const linhas: LinhaDaChamada[] = montarChamada(alunos, [
      { matricula: "25047", situacao: "falta" },
      {
        matricula: "24001",
        situacao: "atraso",
        ocorrencia: "entrada-atrasada",
      },
    ]);

    expect(resumoDaChamada(linhas)).toEqual({
      total: 3,
      presentes: 1,
      faltas: 1,
      atrasos: 1,
      ocorrencias: 1,
    });
  });
});
