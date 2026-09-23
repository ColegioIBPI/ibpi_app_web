import { describe, expect, it } from "vitest";

import {
  caminhoDaFoto,
  formatarTamanho,
  iniciaisDoNome,
  TAMANHO_MAXIMO_BYTES,
  urlDaFoto,
  validarFoto,
} from "@/features/alunos/domain/foto";

describe("validarFoto", () => {
  const arquivo = (type: string, size: number) => ({ type, size });

  it("aceita os formatos que a secretaria vai enviar", () => {
    for (const tipo of [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
    ]) {
      expect(validarFoto(arquivo(tipo, 500_000)).ok).toBe(true);
    }
  });

  it("recusa o que não é imagem", () => {
    const resultado = validarFoto(arquivo("application/pdf", 100_000));
    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toMatch(/formato/i);
  });

  it("recusa imagem acima do limite, dizendo os tamanhos", () => {
    const resultado = validarFoto(arquivo("image/jpeg", 20 * 1024 * 1024));
    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toMatch(/20,0 MB/);
    expect(resultado.erro).toMatch(/8,0 MB/);
  });

  it("aceita exatamente no limite", () => {
    expect(validarFoto(arquivo("image/jpeg", TAMANHO_MAXIMO_BYTES)).ok).toBe(
      true,
    );
  });

  it("recusa arquivo vazio ou ausente", () => {
    expect(validarFoto(arquivo("image/jpeg", 0)).ok).toBe(false);
    expect(validarFoto(null).ok).toBe(false);
  });
});

describe("caminhoDaFoto", () => {
  it("guarda sob a matrícula, para a pasta ser legível", () => {
    expect(caminhoDaFoto("26007")).toBe("alunos/26007/foto.webp");
  });
});

describe("urlDaFoto", () => {
  it("aponta para a rota autenticada, não para o bucket", () => {
    // Foto de menor de idade não tem URL pública adivinhável.
    expect(urlDaFoto("26007")).toBe("/api/alunos/26007/foto");
    expect(urlDaFoto("26007")).not.toMatch(/firebasestorage|googleapis/);
  });

  it("versiona pela data, senão o navegador mostra a foto antiga", () => {
    const url = urlDaFoto("26007", "2026-09-23T18:00:00.000Z");
    expect(url).toContain("?v=");

    const outra = urlDaFoto("26007", "2026-09-24T10:00:00.000Z");
    expect(url).not.toBe(outra);
  });
});

describe("formatarTamanho", () => {
  it("usa MB acima de 1 MB e KB abaixo", () => {
    expect(formatarTamanho(8 * 1024 * 1024)).toBe("8,0 MB");
    expect(formatarTamanho(300 * 1024)).toBe("300 KB");
  });
});

describe("iniciaisDoNome", () => {
  it("usa o primeiro e o último nome", () => {
    expect(iniciaisDoNome("Alice Vianna Fernandes")).toBe("AF");
  });

  it("ignora partícula no fim", () => {
    expect(iniciaisDoNome("Maria da Silva")).toBe("MS");
  });

  it("lida com nome único", () => {
    expect(iniciaisDoNome("Alice")).toBe("AL");
  });

  it("não quebra com nome vazio", () => {
    expect(iniciaisDoNome("   ")).toBe("?");
  });
});
