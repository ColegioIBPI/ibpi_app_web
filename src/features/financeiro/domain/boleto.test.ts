import { describe, expect, it } from "vitest";

import {
  TAMANHO_MAXIMO_DO_BOLETO,
  validarBoleto,
} from "@/features/financeiro/domain/boleto";

const pdf = (size = 120_000) => ({
  type: "application/pdf",
  size,
  name: "boleto.pdf",
});

describe("validarBoleto", () => {
  it("aceita o PDF do banco", () => {
    expect(validarBoleto(pdf()).ok).toBe(true);
  });

  it("recusa imagem, mesmo sendo um formato comum", () => {
    // Foto de boleto corta a linha digitável e o código de barras
    // fotografado não lê no caixa: seria aceitar um arquivo que falha na
    // hora de pagar.
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      const r = validarBoleto({ type, size: 100_000, name: "foto.jpg" });
      expect(r.ok).toBe(false);
      expect(r.erro).toContain("PDF");
    }
  });

  it("recusa arquivo vazio", () => {
    // Acontece com upload interrompido, e um PDF de zero byte abre em
    // branco na mão da família.
    expect(validarBoleto(pdf(0)).ok).toBe(false);
  });

  it("recusa acima do limite, dizendo o tamanho", () => {
    const r = validarBoleto(pdf(TAMANHO_MAXIMO_DO_BOLETO + 1));

    expect(r.ok).toBe(false);
    expect(r.erro).toContain("5,0 MB");
  });

  it("aceita exatamente o limite", () => {
    expect(validarBoleto(pdf(TAMANHO_MAXIMO_DO_BOLETO)).ok).toBe(true);
  });

  it("nomeia o arquivo no erro", () => {
    const r = validarBoleto({ type: "text/plain", size: 10, name: "x.txt" });
    expect(r.erro).toContain("x.txt");
  });
});
