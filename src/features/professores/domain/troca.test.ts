import { describe, expect, it } from "vitest";

import { impedimentoParaTrocar } from "@/features/professores/domain/troca";

const ATUAL = {
  professorId: "juarez",
  ativa: true,
  turmaCodigo: "EM1A",
  disciplinaNome: "Matemática",
};

const ANA = { nome: "Ana Ribeiro", ativo: true };

describe("trocar o professor de uma disciplina", () => {
  it("passa quando o professor novo existe e está ativo", () => {
    expect(impedimentoParaTrocar(ATUAL, "ana", ANA)).toBeNull();
  });

  it("recusa trocar pelo mesmo professor, dizendo o nome", () => {
    // Acontece com o clique distraído numa lista longa, e sem esta trava
    // a ação desativaria e reativaria o mesmo documento.
    expect(impedimentoParaTrocar(ATUAL, "juarez", { nome: "Juarez" })).toBe(
      "Juarez já leciona Matemática nesta turma.",
    );
  });

  it("recusa professor que não existe", () => {
    expect(impedimentoParaTrocar(ATUAL, "fantasma", null)).toBe(
      "Professor não encontrado.",
    );
  });

  it("recusa professor inativo, e diz o que fazer antes", () => {
    expect(
      impedimentoParaTrocar(ATUAL, "ana", { nome: "Ana Ribeiro", ativo: false }),
    ).toContain("Reative o professor");
  });

  it("recusa trocar um vínculo já removido", () => {
    // Trocar aqui reativaria em silêncio o que a secretaria tinha
    // decidido tirar. O caminho certo é Vincular, e a mensagem diz isso.
    expect(
      impedimentoParaTrocar({ ...ATUAL, ativa: false }, "ana", ANA),
    ).toContain("Use Vincular");
  });

  it("a disciplina sem nome não deixa a frase quebrada", () => {
    expect(
      impedimentoParaTrocar(
        { ...ATUAL, disciplinaNome: undefined },
        "juarez",
        { nome: "Juarez" },
      ),
    ).toBe("Juarez já leciona esta disciplina nesta turma.");
  });

  it("professor sem `ativo` no cadastro conta como ativo", () => {
    // O cadastro migrado do Access não tem o campo, e recusar a troca por
    // ausência travaria a escola inteira.
    expect(impedimentoParaTrocar(ATUAL, "ana", { nome: "Ana" })).toBeNull();
  });
});
