import { describe, expect, it } from "vitest";

import type { SituacaoDePresenca } from "@/core/modelo";
import {
  contar,
  faltasQueAindaCabem,
  percentualDePresenca,
  situacaoPorFrequencia,
} from "@/features/frequencia/domain/calculos";

const serie = (...situacoes: SituacaoDePresenca[]) => contar(situacoes);

describe("contar", () => {
  it("separa presença, falta e atraso", () => {
    expect(serie("presente", "falta", "atraso", "presente")).toEqual({
      presencas: 2,
      faltas: 1,
      atrasos: 1,
      dias: 4,
    });
  });

  it("começa zerado", () => {
    expect(contar([])).toEqual({
      presencas: 0,
      faltas: 0,
      atrasos: 0,
      dias: 0,
    });
  });
});

describe("percentualDePresenca", () => {
  it("atraso conta como presença", () => {
    // O aluno atrasado esteve na aula. O atraso interessa à coordenação e
    // é contado à parte, mas não vira falta.
    expect(percentualDePresenca(serie("atraso", "atraso"))).toBe(1);
  });

  it("calcula a proporção de dias em que o aluno esteve presente", () => {
    expect(
      percentualDePresenca(serie("presente", "presente", "falta", "falta")),
    ).toBe(0.5);
  });

  it("devolve null sem dias registrados, em vez de 0% ou 100%", () => {
    // No começo do ano não há o que calcular; mostrar "0% de presença"
    // assustaria a família à toa.
    expect(percentualDePresenca(contar([]))).toBeNull();
  });
});

describe("situacaoPorFrequencia — limite de 25% de faltas", () => {
  it("abaixo de 75% está reprovado por falta", () => {
    expect(situacaoPorFrequencia(0.74)).toBe("reprovado");
    expect(situacaoPorFrequencia(0.5)).toBe("reprovado");
  });

  it("exatamente 75% não reprova, mas fica em atenção", () => {
    // A regra é "mais de 25% de faltas" reprova, então 25% cravado passa.
    // Ainda assim não é "regular": uma falta a mais reprova, e a secretaria
    // precisa enxergar isso antes de acontecer.
    expect(situacaoPorFrequencia(0.75)).not.toBe("reprovado");
    expect(situacaoPorFrequencia(0.75)).toBe("atencao");
  });

  it("entre 75% e 80% alerta antes de virar reprovação", () => {
    expect(situacaoPorFrequencia(0.78)).toBe("atencao");
  });

  it("acima de 80% é regular", () => {
    expect(situacaoPorFrequencia(0.95)).toBe("regular");
    expect(situacaoPorFrequencia(1)).toBe("regular");
  });

  it("sem dados não acusa problema", () => {
    expect(situacaoPorFrequencia(null)).toBe("regular");
  });
});

describe("faltasQueAindaCabem", () => {
  it("responde a pergunta que a família faz ao telefone", () => {
    // 200 dias letivos: cabem 50 faltas. Com 10 dadas, restam 40.
    expect(faltasQueAindaCabem(serie(), 200)).toBe(50);

    const comFaltas = contar(
      Array.from({ length: 10 }, () => "falta" as SituacaoDePresenca),
    );
    expect(faltasQueAindaCabem(comFaltas, 200)).toBe(40);
  });

  it("não devolve número negativo para quem já passou do limite", () => {
    const muitas = contar(
      Array.from({ length: 80 }, () => "falta" as SituacaoDePresenca),
    );
    expect(faltasQueAindaCabem(muitas, 200)).toBe(0);
  });

  it("devolve null sem calendário definido", () => {
    expect(faltasQueAindaCabem(serie(), 0)).toBeNull();
  });
});
