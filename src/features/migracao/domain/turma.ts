import type { Segmento, Turno } from "@/core/modelo/comum";
import {
  chaveDeComparacao,
  limparTexto,
} from "@/features/migracao/domain/texto";

/**
 * Derivação da turma a partir dos campos do aluno no Access.
 *
 * A tabela `Alunos_Turma` do sistema legado está vazia: o vínculo do aluno
 * com a turma nunca foi gravado lá. Ele existe em dois lugares indiretos —
 * os campos `Curso1`/`Etapa1`/`Turno1` do cadastro, e o `CONTROLE DE
 * FALTAS.xlsx`, onde a secretaria escreve a turma todo dia.
 *
 * A regra abaixo reconstrói a turma pelo cadastro, o que cobre os 73 alunos.
 * A planilha entra depois, como conferência: onde as duas discordam, vence a
 * planilha (é o dado do dia a dia) e a divergência vai para o relatório.
 */

// Os tipos e rótulos vivem no modelo de dados: a migração usa o mesmo
// vocabulário do resto do sistema, não um paralelo.
export type { Segmento, Turno } from "@/core/modelo/comum";
export { ROTULOS_DE_SEGMENTO, ROTULOS_DE_TURNO } from "@/core/modelo/comum";

export interface TurmaDerivada {
  /** Código como a secretaria escreve: `EM1A`, `EF9A`, `E.J.A. EM`. */
  codigo: string;
  segmento: Segmento;
  /** Série/ano como está na origem, inclusive as combinadas (`6/7`, `89`). */
  serie: string;
  turno: Turno;
}

const TURNOS: Record<string, Turno> = {
  M: "manha",
  T: "tarde",
  // ⚠️ A confirmar com a secretaria: 3 alunos têm turno "E". A hipótese é
  // EJA Flex, que aparece na tabela de cursos como "ENS MÉDIO - EJA FLEX".
  E: "flex",
};

/** Séries do ensino médio, inclusive as combinadas do EJA. */
const SERIES_DE_MEDIO = new Set(["1", "2", "3", "12", "23", "123"]);

export function derivarTurma(entrada: {
  curso: unknown;
  etapa: unknown;
  turno: unknown;
}): TurmaDerivada | null {
  const curso = chaveDeComparacao(entrada.curso);
  const serie = limparTexto(entrada.etapa);
  const turno = TURNOS[chaveDeComparacao(entrada.turno)] ?? "manha";

  if (!curso || !serie) return null;

  const ehEja = curso.includes("EJA") || ehSerieCombinada(serie);
  const ehMedio = curso.startsWith("EM") || SERIES_DE_MEDIO.has(serie);

  if (ehEja) {
    return {
      codigo: ehMedio ? "E.J.A. EM" : "E.J.A. EF",
      segmento: ehMedio ? "eja-medio" : "eja-fundamental",
      serie,
      turno,
    };
  }

  return {
    // Uma turma por série — é o tamanho do colégio hoje. A letra `A` segue a
    // convenção que a secretaria já usa na planilha.
    codigo: `${ehMedio ? "EM" : "EF"}${serie}A`,
    segmento: ehMedio ? "medio" : "fundamental",
    serie,
    turno,
  };
}

/**
 * Série combinada (`6/7`, `89`, `23`) indica turma de EJA, onde dois anos
 * dividem a mesma sala.
 */
function ehSerieCombinada(serie: string): boolean {
  return serie.includes("/") || /^\d{2,}$/.test(serie);
}

/** Identificador do documento: a turma é sempre de um ano letivo. */
export function idDaTurma(anoLetivo: number, codigo: string): string {
  return `${anoLetivo}-${codigo.replace(/[^A-Za-z0-9]/g, "")}`;
}
