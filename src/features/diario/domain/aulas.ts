import type { Aula } from "@/core/modelo";

/**
 * Grade de aulas do diário de classe.
 *
 * Reproduz a `PAUTA DE CONTEÚDO` que o professor preenche hoje no papel:
 * uma coluna por aula, com data, o conteúdo ministrado e a chamada.
 *
 * O ponto delicado é o **dia sem aula**. Na pauta impressa aparece escrito
 * "férias", "recesso" ou "ponte" no lugar do p/f — e esses dias **não entram
 * no cálculo de frequência**. Contá-los transformaria o recesso escolar em
 * falta de todo mundo.
 */

export type MotivoSemAula = NonNullable<Aula["semAula"]>;

export const ROTULOS_SEM_AULA: Record<MotivoSemAula, string> = {
  ferias: "Férias",
  recesso: "Recesso",
  ponte: "Ponte",
  feriado: "Feriado",
};

/** Id do diário: um por alocação por trimestre, como a pauta impressa. */
export function idDoDiario(alocacaoId: string, trimestre: number): string {
  return `${alocacaoId}-t${trimestre}`;
}

/** Aulas que contam para a frequência. */
export function aulasLetivas(aulas: readonly Aula[]): Aula[] {
  return aulas.filter((aula) => !aula.semAula);
}

/**
 * Percentual de presença do aluno na disciplina.
 *
 * Aula em que o aluno **não foi marcado** conta como presença: o professor
 * marca as faltas, não as presenças, e exigir uma marcação por aluno por
 * aula tornaria o diário digital mais lento que o papel.
 *
 * `null` quando ainda não houve aula letiva — não há o que calcular.
 */
export function percentualNaDisciplina(
  aulas: readonly Aula[],
  matricula: string,
): number | null {
  const letivas = aulasLetivas(aulas);
  if (letivas.length === 0) return null;

  const presencas = letivas.filter(
    (aula) => aula.presencas?.[matricula] !== false,
  ).length;

  return presencas / letivas.length;
}

/** Faltas do aluno na disciplina, no trimestre. */
export function faltasNaDisciplina(
  aulas: readonly Aula[],
  matricula: string,
): number {
  return aulasLetivas(aulas).filter(
    (aula) => aula.presencas?.[matricula] === false,
  ).length;
}

/** Próximo número de aula — a pauta numera sequencialmente. */
export function proximoNumero(aulas: readonly Aula[]): number {
  return aulas.reduce((maior, aula) => Math.max(maior, aula.numero), 0) + 1;
}

export interface Conflito {
  ok: boolean;
  erro?: string;
}

/**
 * Já existe aula nessa data?
 *
 * Duas aulas da mesma disciplina no mesmo dia acontecem (aula dupla), então
 * isto é aviso, não impedimento — mas registrar a mesma data por engano é
 * bem mais comum que a aula dupla.
 */
export function verificarDataRepetida(
  aulas: readonly Aula[],
  data: string,
): Conflito {
  const repetida = aulas.find((aula) => aula.data === data);

  if (!repetida) return { ok: true };

  return {
    ok: false,
    erro: `Já existe a aula ${repetida.numero} nesta data. Se for aula dupla, registre o conteúdo das duas na mesma aula.`,
  };
}

/** Ordena por data, que é como o professor lê a pauta. */
export function ordenarAulas(aulas: readonly Aula[]): Aula[] {
  return [...aulas].sort(
    (a, b) => a.data.localeCompare(b.data) || a.numero - b.numero,
  );
}

/**
 * Marca ou desmarca a falta de um aluno numa aula.
 *
 * Guarda apenas `false` para quem faltou — gravar `true` para os presentes
 * encheria o documento com a turma inteira a cada aula, e o significado é o
 * mesmo.
 */
export function definirPresenca(
  aula: Aula,
  matricula: string,
  presente: boolean,
): Aula {
  const presencas = { ...(aula.presencas ?? {}) };

  if (presente) delete presencas[matricula];
  else presencas[matricula] = false;

  return { ...aula, presencas };
}

export interface ResumoDaAula {
  numero: number;
  data: string;
  faltas: number;
  temConteudo: boolean;
  semAula: MotivoSemAula | null;
}

export function resumirAulas(aulas: readonly Aula[]): ResumoDaAula[] {
  return ordenarAulas(aulas).map((aula) => ({
    numero: aula.numero,
    data: aula.data,
    faltas: Object.values(aula.presencas ?? {}).filter((v) => v === false)
      .length,
    temConteudo: Boolean(aula.conteudo?.trim()),
    semAula: (aula.semAula as MotivoSemAula) ?? null,
  }));
}

/**
 * Aulas letivas sem conteúdo registrado.
 *
 * O conteúdo ministrado é exigência de diário de classe, e é o que a
 * coordenação confere. Dia sem aula não precisa.
 */
export function aulasSemConteudo(aulas: readonly Aula[]): number[] {
  return aulasLetivas(aulas)
    .filter((aula) => !aula.conteudo?.trim())
    .map((aula) => aula.numero)
    .sort((a, b) => a - b);
}
