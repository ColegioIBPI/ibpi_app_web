import { describe, expect, it } from "vitest";

import type { ItemDoRecibo } from "@/core/modelo";
import {
  ehCancelado,
  identificacao,
  idDoRecibo,
  normalizarSerie,
  podeCancelar,
  totalDoRecibo,
} from "@/features/recibos/domain/recibo";

function item(valor: number): ItemDoRecibo {
  return {
    servico: "mensalidade",
    referencia: null,
    formaDePagamento: "pix",
    referenciaDoPagamento: null,
    valor,
  };
}

describe("total do recibo", () => {
  it("soma os itens", () => {
    expect(totalDoRecibo([item(100), item(50.5)])).toBe(150.5);
  });

  it("não acumula erro de ponto flutuante", () => {
    // Somando em reais, `0.1 + 0.2` daria 0.30000000000000004 — e o recibo
    // sairia impresso com um centavo que ninguém pagou.
    expect(totalDoRecibo([item(0.1), item(0.2)])).toBe(0.3);
    expect(totalDoRecibo(Array.from({ length: 3 }, () => item(333.33)))).toBe(
      999.99,
    );
  });

  it("recibo sem item soma zero", () => {
    expect(totalDoRecibo([])).toBe(0);
  });
});

describe("cancelamento", () => {
  it("um recibo confirmado pode ser cancelado", () => {
    expect(podeCancelar({ status: "confirmado" })).toBe(true);
    expect(ehCancelado({ status: "confirmado" })).toBe(false);
  });

  it("um recibo já cancelado não se cancela de novo", () => {
    // Cancelar duas vezes não desfaz nada e apagaria o motivo original,
    // que é o que alguém procura no fechamento do caixa.
    expect(podeCancelar({ status: "cancelado" })).toBe(false);
    expect(ehCancelado({ status: "cancelado" })).toBe(true);
  });
});

describe("identificação", () => {
  it("o id tem a série e o número preenchido com zeros", () => {
    expect(idDoRecibo("A", 42)).toBe("A-000042");
    expect(idDoRecibo("A", 1234567)).toBe("A-1234567");
  });

  it("o id não depende do caixa das letras", () => {
    // `a` e `A` precisam cair no mesmo talão: contadores separados fariam
    // o segundo começar do 1 e repetir recibos que já existem.
    expect(idDoRecibo("a", 42)).toBe(idDoRecibo("A", 42));
    expect(normalizarSerie("  b ")).toBe("B");
  });

  it("mostra série e número para quem lê", () => {
    expect(identificacao({ serie: "A", numero: 42 })).toBe("Série A · nº 42");
  });
});
