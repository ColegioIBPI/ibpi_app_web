import { describe, expect, it } from "vitest";

import { extrairPastaDoDrive, urlDaPasta } from "@/features/alunos/domain/drive";

const PASTA = "1AbC-dEfGhIjKlMnOpQrStUvWxYz0123";

describe("pasta do aluno no Drive", () => {
  it("aceita o link do botão Compartilhar", () => {
    expect(
      extrairPastaDoDrive(
        `https://drive.google.com/drive/folders/${PASTA}?usp=sharing`,
      ),
    ).toBe(PASTA);
  });

  it("ignora o índice da conta no meio do link", () => {
    // O `/u/4/` é a posição da conta Google de quem copiou. Guardá-lo
    // mandaria outra pessoa para a conta errada dela.
    expect(
      extrairPastaDoDrive(`https://drive.google.com/drive/u/4/folders/${PASTA}`),
    ).toBe(PASTA);
  });

  it("aceita o formato antigo com id no parâmetro", () => {
    expect(
      extrairPastaDoDrive(`https://drive.google.com/open?id=${PASTA}`),
    ).toBe(PASTA);
  });

  it("aceita o id colado sozinho", () => {
    expect(extrairPastaDoDrive(PASTA)).toBe(PASTA);
    expect(extrairPastaDoDrive(`  ${PASTA}  `)).toBe(PASTA);
  });

  it("recusa o que não é pasta", () => {
    // `my-drive` é a raiz, não a pasta do aluno — e é exatamente o que o
    // link que a secretaria tem em mãos traz.
    expect(
      extrairPastaDoDrive("https://drive.google.com/drive/u/4/my-drive"),
    ).toBeNull();
    expect(extrairPastaDoDrive("a pasta do João")).toBeNull();
    expect(extrairPastaDoDrive("")).toBeNull();
    expect(extrairPastaDoDrive("   ")).toBeNull();
  });

  it("monta a URL sem a conta, para o Google escolher", () => {
    expect(urlDaPasta(PASTA)).toBe(
      `https://drive.google.com/drive/folders/${PASTA}`,
    );
  });
});
