import { describe, expect, it } from "vitest";

import {
  ehImagem,
  formatar,
  TAMANHO_MAXIMO_DE_ANEXO,
  urlDoAnexo,
  validarAnexo,
} from "@/features/avisos/domain/anexo";

describe("validarAnexo", () => {
  it("aceita PDF e imagem", () => {
    for (const tipo of ["application/pdf", "image/jpeg", "image/png"]) {
      expect(validarAnexo({ type: tipo, size: 200_000 }).ok).toBe(true);
    }
  });

  it("recusa outros formatos, dizendo qual arquivo", () => {
    const resultado = validarAnexo({
      type: "application/zip",
      size: 1000,
      name: "pasta.zip",
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toContain("pasta.zip");
  });

  it("recusa acima do limite", () => {
    const resultado = validarAnexo({
      type: "application/pdf",
      size: 20 * 1024 * 1024,
      name: "circular.pdf",
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toContain("10,0 MB");
  });

  it("aceita exatamente no limite", () => {
    expect(
      validarAnexo({ type: "application/pdf", size: TAMANHO_MAXIMO_DE_ANEXO })
        .ok,
    ).toBe(true);
  });
});

describe("urlDoAnexo", () => {
  it("aponta para a rota autenticada, nunca para o bucket", () => {
    const url = urlDoAnexo("abc123", 0);
    expect(url).toBe("/api/avisos/abc123/anexo/0");
    expect(url).not.toMatch(/firebasestorage|googleapis/);
  });
});

describe("formatar e ehImagem", () => {
  it("formata em MB e KB", () => {
    expect(formatar(2 * 1024 * 1024)).toBe("2,0 MB");
    expect(formatar(150 * 1024)).toBe("150 KB");
  });

  it("distingue imagem de PDF, para a tela decidir se mostra ou baixa", () => {
    expect(ehImagem("image/png")).toBe(true);
    expect(ehImagem("application/pdf")).toBe(false);
  });
});
