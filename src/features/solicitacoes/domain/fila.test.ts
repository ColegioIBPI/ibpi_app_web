import { describe, expect, it } from "vitest";

import type { SituacaoDaSolicitacao } from "@/core/modelo";
import {
  estaEncerrada,
  exigeMotivo,
  ordenarFila,
  podeMover,
  proximasSituacoes,
} from "@/features/solicitacoes/domain/fila";

const TODAS: SituacaoDaSolicitacao[] = [
  "aberta",
  "em-andamento",
  "pronta",
  "entregue",
  "recusada",
  "cancelada",
];

describe("o caminho normal", () => {
  it("vai de aberta a entregue, passo a passo", () => {
    expect(podeMover("aberta", "em-andamento", "escola")).toBe(true);
    expect(podeMover("em-andamento", "pronta", "escola")).toBe(true);
    expect(podeMover("pronta", "entregue", "escola")).toBe(true);
  });

  it("deixa a secretaria pular o 'em andamento'", () => {
    // Declaração de matrícula sai na hora: obrigar o passo intermediário
    // seria burocracia que ninguém cumpriria.
    expect(podeMover("aberta", "pronta", "escola")).toBe(true);
  });

  it("deixa voltar de pronta para em andamento", () => {
    // Imprimiu errado, refaz. O documento ainda não saiu da mão da escola.
    expect(podeMover("pronta", "em-andamento", "escola")).toBe(true);
  });
});

describe("o que não se desfaz", () => {
  it("de entregue não se sai", () => {
    // O documento saiu da mão da escola. Corrigir um engano é abrir outro
    // pedido, que deixa rastro, e não reescrever a história deste.
    for (const destino of TODAS) {
      expect(podeMover("entregue", destino, "escola")).toBe(false);
      expect(podeMover("entregue", destino, "familia")).toBe(false);
    }
  });

  it("recusada e cancelada também são finais", () => {
    for (const origem of ["recusada", "cancelada"] as const) {
      expect(proximasSituacoes(origem, "escola")).toEqual([]);
      expect(proximasSituacoes(origem, "familia")).toEqual([]);
    }
  });

  it("estaEncerrada concorda com a ausência de saída", () => {
    for (const situacao of TODAS) {
      const semSaida =
        proximasSituacoes(situacao, "escola").length === 0 &&
        proximasSituacoes(situacao, "familia").length === 0;

      expect(estaEncerrada(situacao)).toBe(semSaida);
    }
  });
});

describe("o que a família pode", () => {
  it("cancela o pedido que ninguém pegou", () => {
    expect(podeMover("aberta", "cancelada", "familia")).toBe(true);
  });

  it("não cancela depois que a secretaria começou", () => {
    // Alguém já gastou trabalho; sumir com o pedido faria esse trabalho
    // desaparecer da fila sem explicação.
    expect(podeMover("em-andamento", "cancelada", "familia")).toBe(false);
    expect(podeMover("pronta", "cancelada", "familia")).toBe(false);
  });

  it("não atende o próprio pedido", () => {
    // A garantia que importa: nada que a escola faz está ao alcance da
    // família, qualquer que seja a situação de partida.
    for (const origem of TODAS) {
      for (const destino of [
        "em-andamento",
        "pronta",
        "entregue",
        "recusada",
      ] as const) {
        expect(podeMover(origem, destino, "familia")).toBe(false);
      }
    }
  });
});

describe("motivo", () => {
  it("só a recusa exige", () => {
    expect(exigeMotivo("recusada")).toBe(true);

    for (const situacao of TODAS.filter((s) => s !== "recusada")) {
      expect(exigeMotivo(situacao)).toBe(false);
    }
  });
});

describe("ordem da fila", () => {
  const pedido = (abertaEm: string, situacao: SituacaoDaSolicitacao) => ({
    abertaEm,
    situacao,
  });

  it("pendentes primeiro, do mais antigo para o mais novo", () => {
    const fila = ordenarFila([
      pedido("2026-03-10", "aberta"),
      pedido("2026-03-01", "entregue"),
      pedido("2026-03-05", "em-andamento"),
    ]);

    expect(fila.map((p) => p.abertaEm)).toEqual([
      "2026-03-05",
      "2026-03-10",
      "2026-03-01",
    ]);
  });

  it("entre os encerrados, o mais recente no topo", () => {
    // Encerrado é histórico: quem volta a olhar procura o último.
    const fila = ordenarFila([
      pedido("2026-01-01", "entregue"),
      pedido("2026-03-01", "recusada"),
    ]);

    expect(fila.map((p) => p.abertaEm)).toEqual(["2026-03-01", "2026-01-01"]);
  });

  it("não mexe na lista recebida", () => {
    const original = [
      pedido("2026-03-01", "entregue"),
      pedido("2026-03-10", "aberta"),
    ];
    ordenarFila(original);

    expect(original[0].situacao).toBe("entregue");
  });
});
