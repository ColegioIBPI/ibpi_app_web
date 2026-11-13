import { describe, expect, it } from "vitest";

import {
  linhaDaTurma,
  validadeDaCarteirinha,
  validadeDoAnoLetivo,
} from "@/features/carteirinha/domain/carteirinha";

describe("validade", () => {
  it("vale até o último dia do ano letivo", () => {
    expect(validadeDoAnoLetivo(2026)).toBe("2026-12-31");

    expect(
      validadeDaCarteirinha(
        { situacaoMatricula: "ativa" },
        2026,
        "2026-12-31",
      ),
    ).toEqual({ valida: true, ate: "2026-12-31", motivo: null });
  });

  it("no dia seguinte, vence", () => {
    const validade = validadeDaCarteirinha(
      { situacaoMatricula: "ativa" },
      2026,
      "2027-01-02",
    );

    expect(validade.valida).toBe(false);
    expect(validade.motivo).toBe("Vencida em 31/12/2026");
  });

  it("matrícula que não é ativa não tem carteirinha válida", () => {
    // O ponto do arquivo: um cartão bonito depois que o aluno saiu
    // transformaria o sistema em emissor de documento falso.
    for (const situacao of [
      "cancelada",
      "transferida",
      "concluida",
      "abandono",
    ] as const) {
      expect(
        validadeDaCarteirinha({ situacaoMatricula: situacao }, 2026, "2026-03-10")
          .valida,
      ).toBe(false);
    }
  });

  it("a situação vem antes do vencimento, e diz o motivo certo", () => {
    // Dizer "vencida" para quem cancelou em março seria meia-verdade: a
    // portaria leria como "só precisa renovar".
    expect(
      validadeDaCarteirinha(
        { situacaoMatricula: "cancelada" },
        2026,
        "2026-03-10",
      ).motivo,
    ).toBe("Matrícula cancelada");

    expect(
      validadeDaCarteirinha(
        { situacaoMatricula: "transferida" },
        2026,
        "2027-06-01",
      ).motivo,
    ).toBe("Matrícula transferida");
  });

  it("mesmo sem valer, a data limite continua respondida", () => {
    // O cartão inválido ainda é desenhado, com o aviso por cima — e o
    // componente precisa de uma data para imprimir no lugar de `undefined`.
    expect(
      validadeDaCarteirinha(
        { situacaoMatricula: "cancelada" },
        2026,
        "2026-03-10",
      ).ate,
    ).toBe("2026-12-31");
  });
});

describe("linha da turma", () => {
  it("a série solta do cadastro ganha a palavra", () => {
    // Conferido no banco: a série é guardada como `"3"`, e "3 · EM3A" não
    // diz nada a quem lê o cartão.
    expect(linhaDaTurma("EM3A", "3")).toBe("3ª série · EM3A");
  });

  it("texto que não é número sai como está — o EJA guarda assim", () => {
    expect(linhaDaTurma("E.J.A. EF", "Fase II")).toBe("Fase II · E.J.A. EF");
  });

  it("não repete quando o cadastro guarda o mesmo texto nos dois campos", () => {
    // "EM1A · EM1A" seria o resultado de concatenar sem olhar.
    expect(linhaDaTurma("EM1A", "EM1A")).toBe("EM1A");
  });

  it("aceita só um dos dois", () => {
    expect(linhaDaTurma("EM1A", null)).toBe("EM1A");
    expect(linhaDaTurma(null, "1")).toBe("1ª série");
  });

  it("sem nenhum dos dois, marca a ausência em vez de somer", () => {
    expect(linhaDaTurma(null, null)).toBe("—");
    expect(linhaDaTurma("  ", "")).toBe("—");
  });
});
