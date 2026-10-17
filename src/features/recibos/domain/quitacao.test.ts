import { describe, expect, it } from "vitest";

import {
  aindaQuitadaPor,
  dataNoBrasil,
  formaDaParcela,
  impedimentoParaQuitar,
  referenciaDaParcela,
  servicoDaParcela,
} from "@/features/recibos/domain/quitacao";

describe("forma de pagamento na parcela", () => {
  it("joga fora a bandeira, que a parcela não conhece", () => {
    // Gravar `credito-visa` num campo que só aceita `cartao-de-credito`
    // deixaria a coluna de forma de pagamento vazia no extrato.
    expect(formaDaParcela("credito-visa")).toBe("cartao-de-credito");
    expect(formaDaParcela("credito-master")).toBe("cartao-de-credito");
    expect(formaDaParcela("credito-outro")).toBe("cartao-de-credito");
    expect(formaDaParcela("debito-visa")).toBe("cartao-de-debito");
    expect(formaDaParcela("debito-master")).toBe("cartao-de-debito");
    expect(formaDaParcela("debito-outro")).toBe("cartao-de-debito");
  });

  it("mantém as formas que os dois vocabulários compartilham", () => {
    expect(formaDaParcela("pix")).toBe("pix");
    expect(formaDaParcela("dinheiro")).toBe("dinheiro");
    expect(formaDaParcela("boleto")).toBe("boleto");
    expect(formaDaParcela("link-de-pagamento")).toBe("link-de-pagamento");
  });
});

describe("serviço a partir do tipo da parcela", () => {
  it("aproveita os tipos que existem nos dois", () => {
    expect(servicoDaParcela("mensalidade")).toBe("mensalidade");
    expect(servicoDaParcela("taxa-de-matricula")).toBe("taxa-de-matricula");
    expect(servicoDaParcela("dependencia")).toBe("dependencia");
  });

  it("parcela sem tipo não vira mensalidade", () => {
    // As 847 migradas do Access não têm tipo. Chutar "mensalidade"
    // inventaria no recibo — que a família guarda — um dado que ninguém
    // conferiu.
    expect(servicoDaParcela(null)).toBe("outros");
    expect(servicoDaParcela(undefined)).toBe("outros");
    expect(servicoDaParcela("extras")).toBe("outros");
  });
});

describe("referência da parcela", () => {
  it("monta parcela sobre total", () => {
    expect(referenciaDaParcela({ parcela: 5, totalDeParcelas: 12 })).toBe(
      "Parcela 5/12",
    );
  });

  it("fica vazia quando a cobrança não é de carnê", () => {
    expect(referenciaDaParcela({ parcela: null, totalDeParcelas: null })).toBe(
      "",
    );
  });
});

describe("impedimento para quitar", () => {
  const emAberto = { matricula: "26031", dataPagamento: null };

  it("deixa passar a parcela em aberto do próprio aluno", () => {
    expect(impedimentoParaQuitar(emAberto, "26031")).toBeNull();
  });

  it("recusa parcela que sumiu", () => {
    expect(impedimentoParaQuitar(null, "26031")).toEqual({
      motivo: "A parcela não existe mais.",
    });
  });

  it("recusa parcela de outro aluno", () => {
    expect(impedimentoParaQuitar(emAberto, "26099")?.motivo).toMatch(
      /outro aluno/,
    );
  });

  it("recusa parcela já paga", () => {
    // Entre ver a lista e clicar em emitir, o financeiro pode ter dado
    // baixa na mesma parcela — e o segundo recibo passaria por cima.
    expect(
      impedimentoParaQuitar(
        { matricula: "26031", dataPagamento: "2026-03-05" },
        "26031",
      )?.motivo,
    ).toMatch(/já está paga/);
  });
});

describe("desfazer a baixa ao cancelar", () => {
  it("desfaz quando a parcela ainda aponta para este recibo", () => {
    expect(aindaQuitadaPor({ reciboId: "A-000042" }, "A-000042")).toBe(true);
  });

  it("NÃO desfaz quando outro recibo já pagou a parcela", () => {
    // O erro mais caro desta tela: cancelar um recibo antigo apagaria o
    // pagamento lançado por um recibo novo, e a família passaria a dever
    // uma mensalidade que pagou duas vezes.
    expect(aindaQuitadaPor({ reciboId: "A-000043" }, "A-000042")).toBe(false);
    expect(aindaQuitadaPor({ reciboId: null }, "A-000042")).toBe(false);
    expect(aindaQuitadaPor({ reciboId: undefined }, "A-000042")).toBe(false);
  });
});

describe("data do pagamento", () => {
  it("usa o fuso do colégio, não o do servidor", () => {
    // A Vercel roda em UTC: um recibo emitido às 22h de 10/03 em São Paulo
    // é 01h de 11/03 em UTC, e a baixa sairia com a data do dia seguinte.
    expect(dataNoBrasil("2026-03-11T01:30:00.000Z")).toBe("2026-03-10");
    expect(dataNoBrasil("2026-03-10T15:00:00.000Z")).toBe("2026-03-10");
  });
});
