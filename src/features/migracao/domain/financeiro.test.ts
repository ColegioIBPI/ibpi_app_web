import { describe, expect, it } from "vitest";

import {
  hashCurto,
  idDaCobranca,
  parsearContrato,
  parsearParcela,
  parsearValor,
  situacaoDaCobranca,
  tipoDeContrato,
} from "@/features/migracao/domain/financeiro";

describe("parsearParcela", () => {
  it("lê o formato da base", () => {
    expect(parsearParcela("3/12")).toEqual({ numero: 3, total: 12 });
    expect(parsearParcela("1/1")).toEqual({ numero: 1, total: 1 });
  });

  it("aceita espaço em volta da barra", () => {
    expect(parsearParcela(" 2 / 12 ")).toEqual({ numero: 2, total: 12 });
  });

  it("recusa parcela impossível", () => {
    expect(parsearParcela("13/12")).toBeNull();
    expect(parsearParcela("0/12")).toBeNull();
  });

  it("recusa o que não é parcela", () => {
    expect(parsearParcela("anual")).toBeNull();
    expect(parsearParcela(null)).toBeNull();
  });
});

describe("situacaoDaCobranca", () => {
  const hoje = new Date("2026-09-22T12:00:00");

  it("com data de pagamento, está paga", () => {
    expect(
      situacaoDaCobranca({
        vencimento: "2026-01-10",
        dataPagamento: "2026-01-11",
        hoje,
      }),
    ).toBe("paga");
  });

  it("paga conta mesmo quando quitada em atraso", () => {
    // O valor pago pode divergir por juros; a baixa é o que define.
    expect(
      situacaoDaCobranca({
        vencimento: "2026-01-10",
        dataPagamento: "2026-03-01",
        hoje,
      }),
    ).toBe("paga");
  });

  it("sem pagamento e com vencimento passado, está vencida", () => {
    expect(
      situacaoDaCobranca({
        vencimento: "2026-08-10",
        dataPagamento: null,
        hoje,
      }),
    ).toBe("vencida");
  });

  it("sem pagamento e com vencimento futuro, está em aberto", () => {
    expect(
      situacaoDaCobranca({
        vencimento: "2026-10-10",
        dataPagamento: null,
        hoje,
      }),
    ).toBe("aberta");
  });

  it("quem paga no próprio dia do vencimento não fica vencido", () => {
    expect(
      situacaoDaCobranca({
        vencimento: "2026-09-22",
        dataPagamento: null,
        hoje,
      }),
    ).toBe("aberta");
  });

  it("sem vencimento, fica em aberto em vez de virar vencida", () => {
    expect(
      situacaoDaCobranca({ vencimento: null, dataPagamento: null, hoje }),
    ).toBe("aberta");
  });
});

describe("parsearValor", () => {
  it("lê o formato brasileiro", () => {
    expect(parsearValor("1.923,00")).toBe(1923);
    expect(parsearValor("R$ 2.940,00")).toBe(2940);
    expect(parsearValor("800,50")).toBe(800.5);
  });

  it("lê valor sem separador", () => {
    expect(parsearValor("1200")).toBe(1200);
  });

  it("devolve null para campo vazio", () => {
    expect(parsearValor("////")).toBeNull();
    expect(parsearValor(null)).toBeNull();
  });
});

describe("tipoDeContrato", () => {
  it("reconhece os tipos usados na base, apesar da grafia", () => {
    expect(tipoDeContrato("Anuidade")).toBe("anuidade");
    expect(tipoDeContrato("Matricula")).toBe("matricula");
    expect(tipoDeContrato("Tx. de Material")).toBe("taxa-material");
    expect(tipoDeContrato("Dependência")).toBe("dependencia");
    expect(tipoDeContrato("Reclassificação")).toBe("reclassificacao");
  });

  it("cai em 'outros' para tipo desconhecido, sem perder o registro", () => {
    expect(tipoDeContrato("Qualquer coisa")).toBe("outros");
    expect(tipoDeContrato(null)).toBe("outros");
  });
});

describe("parsearContrato", () => {
  it("lê anuidade parcelada com plano", () => {
    expect(parsearContrato("Anuidade", "12XR$1.923,00 Plano Cartão")).toEqual({
      tipo: "anuidade",
      valor: 1923,
      parcelas: 12,
      plano: "cartao",
      descricao: "12XR$1.923,00 Plano Cartão",
    });
  });

  it("distingue os dois planos do mesmo aluno", () => {
    const boleto = parsearContrato("Anuidade", "12XR$2.564,00 Plano Boleto");
    expect(boleto?.plano).toBe("boleto");
    expect(boleto?.valor).toBe(2564);
  });

  it("lê valor único sem parcelamento", () => {
    expect(parsearContrato("Tx. de Material", "R$2.940,00")).toEqual({
      tipo: "taxa-material",
      valor: 2940,
      parcelas: null,
      plano: null,
      descricao: "R$2.940,00",
    });
  });

  it("preserva o texto original mesmo quando não entende o valor", () => {
    // Campo livre nunca é confiável o bastante para apagar a origem.
    const contrato = parsearContrato("Outros", "combinado com a direção");
    expect(contrato?.valor).toBeNull();
    expect(contrato?.descricao).toBe("combinado com a direção");
  });

  it("devolve null quando não há descrição", () => {
    expect(parsearContrato("Anuidade", null)).toBeNull();
  });
});

describe("idDaCobranca", () => {
  it("é determinístico, para a migração poder rodar de novo", () => {
    const a = idDaCobranca("26002", "2026-03-10", { numero: 3, total: 12 });
    const b = idDaCobranca("26002", "2026-03-10", { numero: 3, total: 12 });

    expect(a).toBe(b);
    expect(a).toBe("26002-2026-03-10-3de12");
  });

  it("separa parcelas diferentes do mesmo aluno", () => {
    expect(
      idDaCobranca("26002", "2026-03-10", { numero: 3, total: 12 }),
    ).not.toBe(idDaCobranca("26002", "2026-04-10", { numero: 4, total: 12 }));
  });

  it("lida com cobrança sem parcelamento", () => {
    expect(idDaCobranca("26002", "2025-10-31", null)).toBe(
      "26002-2025-10-31-unica",
    );
  });

  it("separa duas cobranças do mesmo dia com o mesmo rótulo de parcela", () => {
    // Caso real: taxa de matrícula e taxa de material do mesmo aluno, pagas
    // no mesmo dia, ambas registradas como "1/1". Sem o distintivo, uma
    // sobrescreveria a outra na migração.
    const matricula = idDaCobranca(
      "25001",
      "2025-11-19",
      { numero: 1, total: 1 },
      "2160|A248 PIX Tx Matrícula",
    );
    const material = idDaCobranca(
      "25001",
      "2025-11-19",
      { numero: 1, total: 1 },
      "2160|A248 PIX Tx Material",
    );

    expect(matricula).not.toBe(material);
  });

  it("continua determinístico com distintivo", () => {
    const primeira = idDaCobranca("25001", "2025-11-19", null, "2160|Tx");
    const segunda = idDaCobranca("25001", "2025-11-19", null, "2160|Tx");

    expect(primeira).toBe(segunda);
  });
});

describe("hashCurto", () => {
  it("é estável entre execuções", () => {
    expect(hashCurto("qualquer coisa")).toBe(hashCurto("qualquer coisa"));
  });

  it("muda quando o conteúdo muda", () => {
    expect(hashCurto("Tx Matrícula")).not.toBe(hashCurto("Tx Material"));
  });

  it("tem tamanho fixo, para o id não variar de forma", () => {
    for (const entrada of ["", "a", "texto bem mais longo que o normal"]) {
      expect(hashCurto(entrada)).toHaveLength(6);
    }
  });
});
