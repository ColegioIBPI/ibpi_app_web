import { describe, expect, it } from "vitest";

import type { Cobranca } from "@/core/modelo";
import {
  agruparPorAluno,
  aVencerAte,
  descreverResponsaveis,
  ehFinanceiro,
  formatarCPF,
  parcelasAbertas,
  responsavelParaCobranca,
  somenteVencidas,
  tipoDoResponsavel,
  type CobrancaComId,
} from "@/features/financeiro/domain/abertas";

const HOJE = new Date("2026-06-15T12:00:00Z");

const ALUNOS = new Map([
  ["26031", { matricula: "26031", nome: "Alice Vianna", turmaCodigo: "EM1A" }],
]);

const cobranca = (extra: Partial<Cobranca> & { id: string }): CobrancaComId =>
  ({
    matricula: "26031",
    vencimento: "2026-05-10",
    valor: 1923,
    valorPago: null,
    dataPagamento: null,
    tipo: "mensalidade",
    parcela: 5,
    totalDeParcelas: 12,
    origem: "portal",
    ...extra,
  }) as CobrancaComId;

describe("parcelas em aberto", () => {
  it("devolve uma linha por parcela, não um total por aluno", () => {
    // É o ponto do relatório: "Fulano deve R$ 5.769" não diz se são três
    // mensalidades ou a taxa de material de março.
    const linhas = parcelasAbertas(
      [
        cobranca({ id: "a", vencimento: "2026-05-10" }),
        cobranca({ id: "b", vencimento: "2026-06-10", parcela: 6 }),
      ],
      ALUNOS,
      HOJE,
    );

    expect(linhas).toHaveLength(2);
    expect(linhas.map((l) => l.parcela)).toEqual(["5/12", "6/12"]);
  });

  it("deixa de fora o que já foi pago", () => {
    // Relatório de cobrança com parcela quitada é relatório que alguém usa
    // para cobrar quem já pagou.
    const linhas = parcelasAbertas(
      [
        cobranca({ id: "a" }),
        cobranca({ id: "b", dataPagamento: "2026-05-09", valorPago: 1923 }),
      ],
      ALUNOS,
      HOJE,
    );

    expect(linhas.map((l) => l.id)).toEqual(["a"]);
  });

  it("traz o saldo, que o valor não mostra no pagamento parcial", () => {
    const [linha] = parcelasAbertas(
      [cobranca({ id: "a", valor: 1000, valorPago: 400 })],
      ALUNOS,
      HOJE,
    );

    expect(linha.valor).toBe(1000);
    expect(linha.saldo).toBe(600);
  });

  it("conta os dias de atraso e marca a vencida", () => {
    const linhas = parcelasAbertas(
      [
        cobranca({ id: "atrasada", vencimento: "2026-05-10" }),
        cobranca({ id: "a-vencer", vencimento: "2026-07-10" }),
      ],
      ALUNOS,
      HOJE,
    );

    const atrasada = linhas.find((l) => l.id === "atrasada")!;
    expect(atrasada.vencida).toBe(true);
    expect(atrasada.diasDeAtraso).toBe(36);

    const aVencer = linhas.find((l) => l.id === "a-vencer")!;
    expect(aVencer.vencida).toBe(false);
    expect(aVencer.diasDeAtraso).toBe(0);
  });

  it("parcela migrada sem tipo mostra travessão, não vazio", () => {
    const [linha] = parcelasAbertas(
      [cobranca({ id: "a", tipo: null, parcela: null, totalDeParcelas: null })],
      ALUNOS,
      HOJE,
    );

    expect(linha.descricao).toBe("—");
    expect(linha.parcela).toBe("");
  });

  it("ordena por vencimento, que é a ordem de quem cobra", () => {
    const linhas = parcelasAbertas(
      [
        cobranca({ id: "b", vencimento: "2026-06-10" }),
        cobranca({ id: "a", vencimento: "2026-04-10" }),
      ],
      ALUNOS,
      HOJE,
    );

    expect(linhas.map((l) => l.id)).toEqual(["a", "b"]);
  });
});

describe("os dois recortes", () => {
  const linhas = parcelasAbertas(
    [
      cobranca({ id: "atrasada", vencimento: "2026-04-10" }),
      cobranca({ id: "junho", vencimento: "2026-06-30" }),
      cobranca({ id: "agosto", vencimento: "2026-08-10" }),
    ],
    ALUNOS,
    HOJE,
  );

  it("inadimplência é só o que passou do vencimento", () => {
    expect(somenteVencidas(linhas).map((l) => l.id)).toEqual(["atrasada"]);
  });

  it("a receber até a data inclui o atrasado", () => {
    // Quem pergunta "quanto entra até o dia 30" quer o que ainda não
    // entrou; separar o atrasado faria somar duas planilhas.
    expect(aVencerAte(linhas, "2026-06-30").map((l) => l.id)).toEqual([
      "atrasada",
      "junho",
    ]);
  });

  it("a data é inclusiva", () => {
    expect(aVencerAte(linhas, "2026-04-10").map((l) => l.id)).toEqual([
      "atrasada",
    ]);
  });
});

describe("responsáveis no relatório", () => {
  const mae = { nome: "Maria Silva", cpf: "12345678900", tipo: "financeiro" as const, telefone: "+5521999998888" };
  const pai = { nome: "José Silva", cpf: "98765432100", tipo: "academico" as const, telefone: null };
  const migrado = { nome: "Ana", cpf: null, tipo: undefined, telefone: null };

  it("o migrado sem tipo conta como ambos, e não como vazio", () => {
    // Os 118 vindos do Access não têm o campo. Indexar o rótulo com
    // `undefined` imprimiria vazio na coluna que diz a quem ligar.
    expect(tipoDoResponsavel(migrado)).toBe("ambos");
    expect(descreverResponsaveis([migrado])).toBe("Ana · Acadêmico e financeiro");
  });

  it("descreve nome, CPF e tipo", () => {
    expect(descreverResponsaveis([mae, pai])).toBe(
      "Maria Silva · 123.456.789-00 · Financeiro / José Silva · 987.654.321-00 · Acadêmico",
    );
  });

  it("quem é financeiro inclui quem é ambos", () => {
    expect(ehFinanceiro(mae)).toBe(true);
    expect(ehFinanceiro(migrado)).toBe(true);
    expect(ehFinanceiro(pai)).toBe(false);
  });

  it("para cobrar, escolhe o financeiro", () => {
    expect(responsavelParaCobranca([pai, mae])?.nome).toBe("Maria Silva");
  });

  it("sem ninguém financeiro, cai no primeiro em vez de ficar vazio", () => {
    // Uma célula vazia não diz "não há responsável financeiro", diz "o
    // relatório falhou" — e alguém vai procurar o nome no cadastro.
    expect(responsavelParaCobranca([pai])?.nome).toBe("José Silva");
    expect(responsavelParaCobranca([])).toBeNull();
  });
});

describe("CPF", () => {
  it("formata os onze dígitos", () => {
    expect(formatarCPF("12345678900")).toBe("123.456.789-00");
    expect(formatarCPF("123.456.789-00")).toBe("123.456.789-00");
  });

  it("devolve o que veio quando não são onze", () => {
    // Melhor mostrar o número torto que esconder o cadastro errado.
    expect(formatarCPF("123")).toBe("123");
    expect(formatarCPF(null)).toBe("");
  });
});

describe("agrupar por aluno — o relatório impresso", () => {
  const linhas = parcelasAbertas(
    [
      cobranca({ id: "a", vencimento: "2026-04-10", valor: 100 }),
      cobranca({ id: "b", vencimento: "2026-05-10", valor: 200 }),
      cobranca({ id: "c", matricula: "26099", vencimento: "2026-04-10", valor: 50 }),
    ],
    new Map([
      ...ALUNOS,
      ["26099", { matricula: "26099", nome: "Ana Souza", turmaCodigo: "EF6A" }],
    ]),
    HOJE,
  );

  it("a família aparece uma vez, com as parcelas embaixo", () => {
    const grupos = agruparPorAluno(linhas);

    expect(grupos).toHaveLength(2);
    expect(grupos.find((g) => g.matricula === "26031")?.parcelas).toHaveLength(2);
  });

  it("o total é do saldo, não do valor", () => {
    // Pagamento parcial já abatido: senão o relatório cobraria o que já
    // entrou.
    const comParcial = parcelasAbertas(
      [cobranca({ id: "a", valor: 1000, valorPago: 400 })],
      ALUNOS,
      HOJE,
    );

    expect(agruparPorAluno(comParcial)[0].total).toBe(600);
  });

  it("soma as parcelas do mesmo aluno", () => {
    expect(
      agruparPorAluno(linhas).find((g) => g.matricula === "26031")?.total,
    ).toBe(300);
  });

  it("ordena por nome, que é como a folha é conferida", () => {
    // Por vencimento, o mesmo aluno se espalharia pela página inteira.
    expect(agruparPorAluno(linhas).map((g) => g.nome)).toEqual([
      "Alice Vianna",
      "Ana Souza",
    ]);
  });
});
