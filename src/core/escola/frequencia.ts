import type { SituacaoDePresenca } from "@/core/modelo";

/**
 * Cálculo de frequência.
 *
 * A regra do colégio: **mais de 25% de faltas reprova** (README, seção 5.4).
 * O cálculo vive aqui, puro, porque é a conta que decide reprovação — e
 * decisão dessas não pode depender de como a tela soma.
 */

/** Limite legal, adotado pelo colégio: presença mínima de 75%. */
export const FREQUENCIA_MINIMA = 0.75;

/** A partir daqui a tela alerta, antes de virar reprovação. */
export const FREQUENCIA_DE_ALERTA = 0.8;

export interface Contadores {
  presencas: number;
  faltas: number;
  atrasos: number;
  /** Dias com registro. Dia sem aula não entra. */
  dias: number;
}

export function contar(situacoes: readonly SituacaoDePresenca[]): Contadores {
  const contadores: Contadores = {
    presencas: 0,
    faltas: 0,
    atrasos: 0,
    dias: situacoes.length,
  };

  for (const situacao of situacoes) {
    if (situacao === "presente") contadores.presencas += 1;
    if (situacao === "falta") contadores.faltas += 1;
    if (situacao === "atraso") contadores.atrasos += 1;
  }

  return contadores;
}

/**
 * Percentual de presença, de 0 a 1.
 *
 * **Atraso conta como presença.** O aluno atrasado esteve na aula; o atraso
 * é registrado à parte porque interessa à coordenação, mas transformá-lo em
 * falta inventaria uma reprovação que o colégio não aplica.
 *
 * Sem nenhum dia registrado devolve `null`, e não 0% ou 100%: no começo do
 * ano letivo não há o que calcular, e mostrar "0% de presença" assustaria a
 * família à toa.
 */
export function percentualDePresenca(contadores: Contadores): number | null {
  if (contadores.dias === 0) return null;

  return (contadores.presencas + contadores.atrasos) / contadores.dias;
}

export type SituacaoDeFrequencia = "regular" | "atencao" | "reprovado";

export function situacaoPorFrequencia(
  percentual: number | null,
): SituacaoDeFrequencia {
  if (percentual === null) return "regular";
  if (percentual < FREQUENCIA_MINIMA) return "reprovado";
  if (percentual < FREQUENCIA_DE_ALERTA) return "atencao";

  return "regular";
}

export const ROTULOS_DE_FREQUENCIA: Record<SituacaoDeFrequencia, string> = {
  regular: "Frequência regular",
  atencao: "Perto do limite de faltas",
  reprovado: "Abaixo do mínimo de 75%",
};

/**
 * Quantas faltas ainda cabem antes de o aluno passar do limite.
 *
 * É o número que a secretaria precisa quando a família liga perguntando
 * "posso faltar amanhã?". `null` quando ainda não há dias registrados.
 */
export function faltasQueAindaCabem(
  contadores: Contadores,
  diasLetivosPrevistos: number,
): number | null {
  if (diasLetivosPrevistos <= 0) return null;

  const faltasPermitidas = Math.floor(
    diasLetivosPrevistos * (1 - FREQUENCIA_MINIMA),
  );

  return Math.max(0, faltasPermitidas - contadores.faltas);
}
