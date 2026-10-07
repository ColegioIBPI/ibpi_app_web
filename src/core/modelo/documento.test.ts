import { describe, expect, it } from "vitest";

import { documentoSolicitavelSchema } from "@/core/modelo/documento";

const base = {
  nome: "Declaração de matrícula",
  origem: "portal" as const,
};

describe("documentoSolicitavelSchema", () => {
  it("um documento gratuito e sem prazo é válido", () => {
    // O caso mais simples: a secretaria cadastra só o nome.
    const resultado = documentoSolicitavelSchema.safeParse(base);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.valor).toBeNull();
    expect(resultado.data?.prazoEmDiasUteis).toBeNull();
    expect(resultado.data?.exigeComprovante).toBe(false);
    expect(resultado.data?.ativo).toBe(true);
    expect(resultado.data?.ordem).toBe(0);
  });

  it("distingue sem prazo de pronto na hora", () => {
    // `null` é "não prometemos prazo"; zero é "sai na hora". São promessas
    // diferentes, e a tela mostra coisas diferentes.
    const semPrazo = documentoSolicitavelSchema.parse(base);
    const naHora = documentoSolicitavelSchema.parse({
      ...base,
      prazoEmDiasUteis: 0,
    });

    expect(semPrazo.prazoEmDiasUteis).toBeNull();
    expect(naHora.prazoEmDiasUteis).toBe(0);
  });

  it("aceita documento cobrado sem exigir comprovante", () => {
    // Acontece quando a família paga na secretaria, em dinheiro: há valor e
    // não há o que anexar. Deduzir um do outro erraria nesse caso.
    const resultado = documentoSolicitavelSchema.safeParse({
      ...base,
      nome: "Histórico escolar",
      valor: 15,
      exigeComprovante: false,
    });

    expect(resultado.success).toBe(true);
    expect(resultado.data?.valor).toBe(15);
  });

  it("recusa nome vazio", () => {
    expect(
      documentoSolicitavelSchema.safeParse({ ...base, nome: " " }).success,
    ).toBe(false);
  });

  it("recusa valor e prazo negativos", () => {
    expect(
      documentoSolicitavelSchema.safeParse({ ...base, valor: -1 }).success,
    ).toBe(false);
    expect(
      documentoSolicitavelSchema.safeParse({ ...base, prazoEmDiasUteis: -1 })
        .success,
    ).toBe(false);
  });

  it("recusa prazo quebrado", () => {
    // Dia útil não se divide: "2,5 dias" não é uma promessa que a secretaria
    // consiga cumprir nem a família consiga entender.
    expect(
      documentoSolicitavelSchema.safeParse({ ...base, prazoEmDiasUteis: 2.5 })
        .success,
    ).toBe(false);
  });
});
