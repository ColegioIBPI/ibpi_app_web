import { describe, expect, it } from "vitest";

import { ROLES, type Role } from "@/core/auth/roles";
import type { SituacaoDaSolicitacao, TipoDeSolicitacao } from "@/core/modelo";
import {
  estaEncerrada,
  exigeMotivo,
  ordenarFila,
  podeAtender,
  podeMover,
  proximasSituacoes,
  tiposQueAtende,
} from "@/features/solicitacoes/domain/fila";

const TODAS: SituacaoDaSolicitacao[] = [
  "aberta",
  "em-andamento",
  "pronta",
  "entregue",
  "autorizada",
  "recusada",
  "cancelada",
];

const TIPOS: TipoDeSolicitacao[] = [
  "documentacao",
  "saida-antecipada",
  "segunda-chamada",
];

describe("documentação — o caminho normal", () => {
  it("vai de aberta a entregue, passo a passo", () => {
    expect(podeMover("documentacao", "aberta", "em-andamento", "escola")).toBe(
      true,
    );
    expect(podeMover("documentacao", "em-andamento", "pronta", "escola")).toBe(
      true,
    );
    expect(podeMover("documentacao", "pronta", "entregue", "escola")).toBe(
      true,
    );
  });

  it("deixa a secretaria pular o 'em andamento'", () => {
    // Declaração de matrícula sai na hora: obrigar o passo intermediário
    // seria burocracia que ninguém cumpriria.
    expect(podeMover("documentacao", "aberta", "pronta", "escola")).toBe(true);
  });

  it("deixa voltar de pronta para em andamento", () => {
    // Imprimiu errado, refaz. O documento ainda não saiu da mão da escola.
    expect(podeMover("documentacao", "pronta", "em-andamento", "escola")).toBe(
      true,
    );
  });
});

describe("saída antecipada — é sim ou não", () => {
  it("não tem 'pronta' nem 'entregue'", () => {
    // O que a família espera não é um documento, é uma resposta.
    for (const destino of ["pronta", "entregue", "em-andamento"] as const) {
      expect(podeMover("saida-antecipada", "aberta", destino, "escola")).toBe(
        false,
      );
    }
  });

  it("a coordenação autoriza ou recusa", () => {
    expect(proximasSituacoes("saida-antecipada", "aberta", "escola")).toEqual([
      "autorizada",
      "recusada",
    ]);
  });

  it("de autorizada ainda se volta atrás", () => {
    // Diferente de `entregue`: ali algo já aconteceu; aqui é permissão para
    // um momento que ainda não chegou. Enquanto o aluno não saiu, a
    // coordenação pode mudar de ideia — e proibir empurraria a reversão
    // para fora do sistema, onde não deixa rastro.
    expect(
      podeMover("saida-antecipada", "autorizada", "recusada", "escola"),
    ).toBe(true);
  });

  it("autorizar não é passo de documentação", () => {
    expect(podeMover("documentacao", "aberta", "autorizada", "escola")).toBe(
      false,
    );
  });
});

describe("quem atende cada tipo", () => {
  it("saída antecipada é decisão da coordenação", () => {
    // Quem responde por tirar um aluno da aula é a coordenação; o pedido
    // nem aparece na fila de quem não decide.
    expect(podeAtender("coordenacao", "saida-antecipada")).toBe(true);
    expect(podeAtender("admin", "saida-antecipada")).toBe(true);
    expect(podeAtender("secretaria", "saida-antecipada")).toBe(false);
  });

  it("documentação é trabalho de secretaria também", () => {
    expect(podeAtender("secretaria", "documentacao")).toBe(true);
  });

  it("a administração enxerga todos os tipos", () => {
    expect(tiposQueAtende("admin")).toEqual(TIPOS);
  });

  it("a secretaria enxerga tudo menos saída antecipada", () => {
    expect(tiposQueAtende("secretaria")).toEqual([
      "documentacao",
      "segunda-chamada",
    ]);
  });

  it("quem não é da escola não atende nada", () => {
    for (const role of ROLES.filter(
      (r) => !["secretaria", "coordenacao", "admin"].includes(r),
    ) as Role[]) {
      expect(tiposQueAtende(role)).toEqual([]);
    }
  });
});

describe("o que não se desfaz", () => {
  it("de entregue não se sai", () => {
    // O documento saiu da mão da escola. Corrigir um engano é abrir outro
    // pedido, que deixa rastro, e não reescrever a história deste.
    for (const destino of TODAS) {
      expect(podeMover("documentacao", "entregue", destino, "escola")).toBe(
        false,
      );
      expect(podeMover("documentacao", "entregue", destino, "familia")).toBe(
        false,
      );
    }
  });

  it("recusada e cancelada são finais em todo tipo", () => {
    for (const tipo of TIPOS) {
      for (const origem of ["recusada", "cancelada"] as const) {
        expect(proximasSituacoes(tipo, origem, "escola")).toEqual([]);
        expect(proximasSituacoes(tipo, origem, "familia")).toEqual([]);
      }
    }
  });

  it("estaEncerrada marca o que não tem saída em tipo nenhum", () => {
    for (const situacao of TODAS) {
      const temSaida = TIPOS.some(
        (tipo) =>
          proximasSituacoes(tipo, situacao, "escola").length > 0 ||
          proximasSituacoes(tipo, situacao, "familia").length > 0,
      );

      if (estaEncerrada(situacao)) expect(temSaida).toBe(false);
    }
  });
});

describe("o que a família pode", () => {
  it("cancela o pedido que ninguém pegou, em qualquer tipo", () => {
    for (const tipo of TIPOS) {
      expect(podeMover(tipo, "aberta", "cancelada", "familia")).toBe(true);
    }
  });

  it("não cancela depois que a escola começou", () => {
    // Alguém já gastou trabalho; sumir com o pedido faria esse trabalho
    // desaparecer da fila sem explicação.
    expect(
      podeMover("documentacao", "em-andamento", "cancelada", "familia"),
    ).toBe(false);
    expect(
      podeMover("saida-antecipada", "autorizada", "cancelada", "familia"),
    ).toBe(false);
  });

  it("não atende o próprio pedido", () => {
    // A garantia que importa: nada que a escola faz está ao alcance da
    // família, em tipo nenhum e de situação nenhuma.
    for (const tipo of TIPOS) {
      for (const origem of TODAS) {
        for (const destino of [
          "em-andamento",
          "pronta",
          "entregue",
          "autorizada",
          "recusada",
        ] as const) {
          expect(podeMover(tipo, origem, destino, "familia")).toBe(false);
        }
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
