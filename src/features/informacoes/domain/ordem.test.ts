import { describe, expect, it } from "vitest";

import { ordenarCards } from "@/features/informacoes/domain/ordem";

const card = (ordem: number, titulo: string) => ({ ordem, titulo });

describe("ordenarCards", () => {
  it("usa a ordem definida na publicação", () => {
    const cards = ordenarCards([
      card(30, "Eletivas"),
      card(10, "Calendário escolar"),
      card(20, "Horário das aulas"),
    ]);

    expect(cards.map((c) => c.titulo)).toEqual([
      "Calendário escolar",
      "Horário das aulas",
      "Eletivas",
    ]);
  });

  it("desempata pelo título quando a ordem é a mesma", () => {
    const cards = ordenarCards([
      card(0, "Tutoria"),
      card(0, "Dependências"),
      card(0, "Proposta Pedagógica"),
    ]);

    expect(cards.map((c) => c.titulo)).toEqual([
      "Dependências",
      "Proposta Pedagógica",
      "Tutoria",
    ]);
  });

  it("ordena acentos como o português espera", () => {
    const cards = ordenarCards([card(0, "Eletivas"), card(0, "Água")]);

    expect(cards.map((c) => c.titulo)).toEqual(["Água", "Eletivas"]);
  });

  it("trata ordem ausente como zero", () => {
    const cards = ordenarCards([
      { titulo: "Com ordem", ordem: 5 },
      { titulo: "Sem ordem" } as { titulo: string; ordem: number },
    ]);

    expect(cards[0]?.titulo).toBe("Sem ordem");
  });

  it("não mexe na lista recebida", () => {
    const original = [card(20, "B"), card(10, "A")];
    ordenarCards(original);

    expect(original.map((c) => c.titulo)).toEqual(["B", "A"]);
  });
});
