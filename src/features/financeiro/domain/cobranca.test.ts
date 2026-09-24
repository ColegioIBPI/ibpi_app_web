import { describe, expect, it } from "vitest";

import type { Cobranca } from "@/core/modelo";
import {
  diasDeAtraso,
  filtrarCobrancas,
  ordenarPorVencimento,
  pagaParcialmente,
  saldo,
  situacaoDaCobranca,
  totalizar,
} from "@/features/financeiro/domain/cobranca";

const HOJE = "2026-09-24";

const cobranca = (
  vencimento: string,
  valor: number | null = 1000,
  extra: Partial<Cobranca> = {},
): Cobranca =>
  ({
    matricula: "26007",
    vencimento,
    valor,
    valorPago: extra.valorPago ?? 0,
    dataPagamento: extra.dataPagamento ?? null,
    parcela: extra.parcela ?? 1,
    totalDeParcelas: extra.totalDeParcelas ?? 1,
    origem: "portal",
  }) as Cobranca;

describe("situacaoDaCobranca", () => {
  it("parcela paga é paga, mesmo vencida", () => {
    // Atraso quitado não é inadimplência.
    expect(
      situacaoDaCobranca(
        { vencimento: "2026-03-05", dataPagamento: "2026-03-20" },
        HOJE,
      ),
    ).toBe("paga");
  });

  it("sem pagamento e passado do prazo, é vencida", () => {
    expect(situacaoDaCobranca({ vencimento: "2026-09-23" }, HOJE)).toBe(
      "vencida",
    );
  });

  it("vencendo hoje ainda está em aberto", () => {
    // O dia do vencimento é do pagador: cobrar atraso nele seria injusto.
    expect(situacaoDaCobranca({ vencimento: HOJE }, HOJE)).toBe("aberta");
  });

  it("vencimento futuro está em aberto", () => {
    expect(situacaoDaCobranca({ vencimento: "2026-12-05" }, HOJE)).toBe(
      "aberta",
    );
  });

  it("a mesma parcela muda de situação com o tempo", () => {
    // É por isso que a situação não pode ficar gravada: uma parcela salva
    // como "em aberto" continuaria assim muito depois de vencer.
    const parcela = { vencimento: "2026-10-05" };

    expect(situacaoDaCobranca(parcela, "2026-09-24")).toBe("aberta");
    expect(situacaoDaCobranca(parcela, "2026-11-01")).toBe("vencida");
  });
});

describe("diasDeAtraso", () => {
  it("conta os dias desde o vencimento", () => {
    expect(diasDeAtraso({ vencimento: "2026-09-14" }, HOJE)).toBe(10);
  });

  it("é zero para o que está em dia", () => {
    expect(diasDeAtraso({ vencimento: "2026-12-05" }, HOJE)).toBe(0);
  });

  it("é zero para o que já foi pago", () => {
    expect(
      diasDeAtraso(
        { vencimento: "2026-03-05", dataPagamento: "2026-04-01" },
        HOJE,
      ),
    ).toBe(0);
  });

  it("atravessa a virada do mês sem erro de fuso", () => {
    expect(diasDeAtraso({ vencimento: "2026-08-31" }, "2026-09-01")).toBe(1);
  });
});

describe("saldo e pagaParcialmente", () => {
  it("saldo é o que falta pagar", () => {
    expect(saldo({ valor: 1000, valorPago: 400 })).toBe(600);
  });

  it("valor pago zero é o mesmo que não pago", () => {
    // O Access gravou 0 para quem não pagou.
    expect(saldo({ valor: 1000, valorPago: 0 })).toBe(1000);
  });

  it("não devolve centavo fantasma", () => {
    expect(saldo({ valor: 0.3, valorPago: 0.1 })).toBe(0.2);
  });

  it("aponta o pagamento parcial", () => {
    expect(
      pagaParcialmente({
        valor: 1000,
        valorPago: 600,
        dataPagamento: "2026-05-05",
      }),
    ).toBe(true);
  });

  it("quitado por inteiro não é parcial", () => {
    expect(
      pagaParcialmente({
        valor: 1000,
        valorPago: 1000,
        dataPagamento: "2026-05-05",
      }),
    ).toBe(false);
  });

  it("o que nunca foi pago não é 'parcial', é em aberto", () => {
    expect(
      pagaParcialmente({ valor: 1000, valorPago: 0, dataPagamento: null }),
    ).toBe(false);
  });
});

describe("totalizar", () => {
  const extrato = [
    cobranca("2026-03-05", 1000, {
      dataPagamento: "2026-03-05",
      valorPago: 1000,
    }),
    cobranca("2026-08-05", 1000), // vencida
    cobranca("2026-12-05", 1000), // em aberto
  ];

  it("separa o que já venceu do que ainda vai vencer", () => {
    // Somar os dois num número só gera a pergunta "então devo isso ou
    // aquilo?".
    expect(totalizar(extrato, HOJE)).toEqual({
      parcelas: 3,
      contratado: 3000,
      pago: 1000,
      emAberto: 2000,
      vencido: 1000,
    });
  });

  it("o pagamento parcial deixa saldo em aberto", () => {
    const parcial = [
      cobranca("2026-08-05", 1000, {
        dataPagamento: "2026-08-05",
        valorPago: 600,
      }),
    ];

    const totais = totalizar(parcial, HOJE);
    expect(totais.pago).toBe(600);
    expect(totais.emAberto).toBe(400);
    // Foi paga, então não entra na cobrança de vencidos.
    expect(totais.vencido).toBe(0);
  });

  it("extrato vazio zera tudo", () => {
    expect(totalizar([], HOJE)).toEqual({
      parcelas: 0,
      contratado: 0,
      pago: 0,
      emAberto: 0,
      vencido: 0,
    });
  });

  it("soma sem erro de ponto flutuante", () => {
    const centavos = [cobranca("2026-12-01", 0.1), cobranca("2026-12-02", 0.2)];

    expect(totalizar(centavos, HOJE).contratado).toBe(0.3);
  });
});

describe("ordenarPorVencimento", () => {
  it("segue a ordem do carnê", () => {
    const fora = [cobranca("2026-05-05", 1000, { parcela: 2 }), cobranca("2026-04-05", 1000, { parcela: 1 })];

    expect(ordenarPorVencimento(fora).map((c) => c.parcela)).toEqual([1, 2]);
  });
});

describe("filtrarCobrancas", () => {
  const extrato = [
    cobranca("2026-03-05", 1000, { dataPagamento: "2026-03-05", valorPago: 1000 }),
    cobranca("2026-08-05"),
    cobranca("2026-12-05"),
  ];

  it("filtra pela situação calculada, não pela gravada", () => {
    expect(filtrarCobrancas(extrato, { situacao: "vencida" }, HOJE)).toHaveLength(1);
    expect(filtrarCobrancas(extrato, { situacao: "paga" }, HOJE)).toHaveLength(1);
    expect(filtrarCobrancas(extrato, { situacao: "aberta" }, HOJE)).toHaveLength(1);
  });

  it("filtra por período de vencimento, incluindo as pontas", () => {
    expect(
      filtrarCobrancas(extrato, { de: "2026-03-05", ate: "2026-08-05" }, HOJE),
    ).toHaveLength(2);
  });

  it("sem filtro devolve tudo", () => {
    expect(filtrarCobrancas(extrato, {}, HOJE)).toHaveLength(3);
    expect(filtrarCobrancas(extrato, { situacao: "todas" }, HOJE)).toHaveLength(3);
  });
});
