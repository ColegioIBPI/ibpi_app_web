import { describe, expect, it } from "vitest";

import type { Role } from "@/core/auth/roles";
import {
  podeVerBoleto,
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

describe("quem enxerga o boleto", () => {
  const equipe = (role: Role) => ({ role, alunosVinculados: [] });

  it("quem tem o recurso financeiro vê o de qualquer aluno", () => {
    for (const role of ["secretaria", "financeiro", "admin"] as const) {
      expect(podeVerBoleto(equipe(role), "26029")).toBe(true);
    }
  });

  it("quem é equipe sem o recurso NÃO vê", () => {
    // A rota serve o PDF com o Admin SDK, que ignora as Security Rules —
    // então é esta função que repete o recorte. Com `isEquipe` aqui, o
    // professor baixava o boleto que a regra do banco nega.
    for (const role of ["professor", "inspetor", "coordenacao"] as const) {
      expect(podeVerBoleto(equipe(role), "26029")).toBe(false);
    }
  });

  it("o responsável vê o do filho, e só o dele", () => {
    const mae = { role: "responsavel" as const, alunosVinculados: ["26029"] };

    expect(podeVerBoleto(mae, "26029")).toBe(true);
    expect(podeVerBoleto(mae, "26031")).toBe(false);
  });

  it("o aluno não vê o próprio boleto", () => {
    // Mensalidade é assunto de quem paga.
    expect(
      podeVerBoleto({ role: "aluno", alunosVinculados: ["26029"] }, "26029"),
    ).toBe(false);
  });
});
