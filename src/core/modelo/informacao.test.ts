import { describe, expect, it } from "vitest";

import { chaveDoDestino } from "@/core/modelo/aviso";
import {
  ESCOPO_USUAL,
  informacaoSchema,
  ROTULOS_DE_INFORMACAO,
  tipoDeInformacaoSchema,
} from "@/core/modelo/informacao";

const base = {
  tipo: "calendario-escolar" as const,
  titulo: "Calendário escolar 2026",
  url: "https://colegioibpi.com.br/calendario.pdf",
  destino: { tipo: "todos" as const },
  chave: "todos",
  publicadoPorUid: "uid-secretaria",
  publicadoEm: "2026-02-01T12:00:00.000Z",
  origem: "portal" as const,
};

describe("informacaoSchema", () => {
  it("aceita uma publicação completa", () => {
    const resultado = informacaoSchema.safeParse(base);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.ativo).toBe(true);
    expect(resultado.data?.ordem).toBe(0);
  });

  it("recusa endereço que não é http nem https", () => {
    // O card abre o endereço no navegador: um `javascript:` aqui viraria
    // execução de código na tela da família.
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///C:/calendario.pdf",
    ]) {
      expect(informacaoSchema.safeParse({ ...base, url }).success).toBe(false);
    }
  });

  it("recusa título vazio e endereço vazio", () => {
    expect(informacaoSchema.safeParse({ ...base, titulo: "  " }).success).toBe(
      false,
    );
    expect(informacaoSchema.safeParse({ ...base, url: "" }).success).toBe(
      false,
    );
  });

  it("guarda a chave derivada do destino, como os avisos", () => {
    const destino = {
      tipo: "turma" as const,
      turmaId: "t1",
      turmaCodigo: "EM3A",
    };

    const resultado = informacaoSchema.safeParse({
      ...base,
      tipo: "horario-de-aulas",
      destino,
      chave: chaveDoDestino(destino),
    });

    expect(resultado.success).toBe(true);
    expect(resultado.data?.chave).toBe("turma:t1");
  });
});

describe("catálogo de tipos", () => {
  it("todo tipo tem rótulo e alcance sugerido", () => {
    for (const tipo of tipoDeInformacaoSchema.options) {
      expect(ROTULOS_DE_INFORMACAO[tipo]).toBeTruthy();
      expect(ESCOPO_USUAL[tipo]).toBeTruthy();
    }
  });

  it("segue o alcance que o colégio pediu para cada material", () => {
    expect(ESCOPO_USUAL["horario-de-aulas"]).toBe("turma");
    expect(ESCOPO_USUAL["calendario-de-avaliacao"]).toBe("segmento");
    expect(ESCOPO_USUAL["calendario-escolar"]).toBe("todos");
    expect(ESCOPO_USUAL["criterios-de-avaliacao"]).toBe("segmento");
    expect(ESCOPO_USUAL["proposta-pedagogica"]).toBe("todos");
    expect(ESCOPO_USUAL.dependencias).toBe("segmento");
    expect(ESCOPO_USUAL.eletivas).toBe("segmento");
    expect(ESCOPO_USUAL.tutoria).toBe("aluno");
  });
});
