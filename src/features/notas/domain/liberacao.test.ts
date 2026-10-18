import { describe, expect, it } from "vitest";

import {
  estaLiberado,
  marcarLiberacao,
  quemLiberou,
  somenteLiberadas,
  trimestresLiberados,
  ultimoLiberado,
} from "@/features/notas/domain/liberacao";

const liberacao = (em: string) => ({ em, porNome: "Cristiana" });

const comDois = {
  liberacoes: { "1": liberacao("2026-04-10"), "2": liberacao("2026-08-12") },
};

describe("o que está liberado", () => {
  it("responde por trimestre", () => {
    expect(estaLiberado(comDois, "1")).toBe(true);
    expect(estaLiberado(comDois, "3")).toBe(false);
  });

  it("aluno sem boletim não tem nada liberado", () => {
    // Diferente de boletim vazio: aqui não há sequer o documento.
    expect(estaLiberado(null, "1")).toBe(false);
    expect(trimestresLiberados(null)).toEqual([]);
    expect(ultimoLiberado(null)).toBeNull();
  });

  it("lista em ordem, mesmo liberando fora de ordem", () => {
    const foraDeOrdem = {
      liberacoes: { "3": liberacao("2026-12-01"), "1": liberacao("2026-04-10") },
    };

    expect(trimestresLiberados(foraDeOrdem)).toEqual(["1", "3"]);
  });

  it("o último liberado é o boletim atual da família", () => {
    expect(ultimoLiberado(comDois)).toBe("2");
    expect(ultimoLiberado({ liberacoes: {} })).toBeNull();
  });

  it("guarda quem liberou e quando", () => {
    // É a resposta para "desde quando meu filho podia ver isso".
    expect(quemLiberou(comDois, "1")?.porNome).toBe("Cristiana");
    expect(quemLiberou(comDois, "3")).toBeNull();
  });
});

describe("marcar e recolher", () => {
  it("liberar grava quem e quando", () => {
    const depois = marcarLiberacao({}, "1", true, "Cristiana", "2026-04-10");

    expect(depois["1"]).toEqual({ em: "2026-04-10", porNome: "Cristiana" });
  });

  it("recolher apaga o registro, não grava false", () => {
    // Um registro que diz "não liberado desde ontem" não responde a
    // pergunta que interessa, que é quando foi liberado.
    const depois = marcarLiberacao(
      comDois.liberacoes,
      "1",
      false,
      "Cristiana",
    );

    expect(depois["1"]).toBeUndefined();
    expect(depois["2"]).toBeDefined();
  });

  it("não mexe no objeto recebido", () => {
    const originais = { "1": liberacao("2026-04-10") };
    marcarLiberacao(originais, "2", true, "Cristiana");

    expect(Object.keys(originais)).toEqual(["1"]);
  });
});

describe("recorte das notas", () => {
  const notas = [
    { trimestre: 1, nota: 8 },
    { trimestre: 2, nota: 7 },
    { trimestre: 3, nota: 9 },
  ];

  it("entrega só o que foi liberado", () => {
    expect(somenteLiberadas(notas, comDois).map((n) => n.trimestre)).toEqual([
      1, 2,
    ]);
  });

  it("compara número com texto sem escorregar", () => {
    // A nota guarda o trimestre como número; a liberação, como chave de
    // texto. Comparar `1` com `"1"` direto entregaria o boletim inteiro.
    expect(somenteLiberadas([{ trimestre: "1" }], comDois)).toHaveLength(1);
    expect(somenteLiberadas([{ trimestre: 1 }], comDois)).toHaveLength(1);
  });

  it("nada liberado devolve lista vazia, não a lista inteira", () => {
    expect(somenteLiberadas(notas, null)).toEqual([]);
    expect(somenteLiberadas(notas, { liberacoes: {} })).toEqual([]);
  });
});
