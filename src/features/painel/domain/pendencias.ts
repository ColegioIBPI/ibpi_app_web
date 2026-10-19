/**
 * O que precisa de alguém hoje.
 *
 * A tela inicial repetia o menu lateral — informação que a pessoa já tem
 * antes de olhar. O que falta a quem abre o sistema de manhã é outra
 * coisa: **o que está parado esperando**.
 *
 * O teste de cada indicador aqui foi um só: *esse número faz alguém fazer
 * alguma coisa hoje?* Se não faz, é vaidade e ficou de fora — total de
 * alunos matriculados não muda a manhã de ninguém.
 */

export type Gravidade = "alta" | "media" | "baixa";

export interface Pendencia {
  chave: string;
  titulo: string;
  /** O número que importa, já formatado. */
  valor: string;
  /** Uma linha dizendo o que fazer, não o que é. */
  detalhe: string;
  href: string;
  gravidade: Gravidade;
}

/**
 * Pendência vazia **não vira cartão**.
 *
 * Painel cheio de zero ensina a ignorar painel. Quem está em dia merece
 * uma linha dizendo isso, não seis caixas dizendo "0".
 */
export function comPendencia(pendencias: Pendencia[]): Pendencia[] {
  return pendencias.filter((p) => p.valor !== "0");
}

export function plural(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

/**
 * Sábado e domingo não têm chamada.
 *
 * Sem isto o painel cobraria a chamada de dez turmas todo fim de semana, e
 * na segunda-feira ninguém mais olharia o cartão.
 */
export function ehDiaLetivo(data: Date): boolean {
  const dia = data.getDay();

  return dia !== 0 && dia !== 6;
}

export interface TurmaDaChamada {
  id: string;
  codigo: string;
}

/** As turmas ativas que ainda não têm nenhum lançamento no dia. */
export function turmasSemChamada(
  turmas: TurmaDaChamada[],
  turmasComLancamento: Set<string>,
): TurmaDaChamada[] {
  return turmas.filter((turma) => !turmasComLancamento.has(turma.id));
}

export interface AlunoComFrequencia {
  matricula: string;
  nome: string;
  percentual: number | null;
}

/**
 * Quem está abaixo do mínimo de 75%.
 *
 * É o indicador mais valioso do painel e o que o colégio hoje só descobre
 * no fim do ano: reprovação por falta não tem recuperação, então o aviso só
 * serve se chegar com meses de antecedência.
 *
 * Aluno sem registro nenhum fica de fora — `null` não é zero por cento, é
 * "ainda não há o que calcular".
 */
export function abaixoDaFrequencia(
  alunos: AlunoComFrequencia[],
  minimo = 0.75,
): AlunoComFrequencia[] {
  return alunos
    .filter((aluno) => aluno.percentual !== null && aluno.percentual < minimo)
    .sort((a, b) => (a.percentual ?? 0) - (b.percentual ?? 0));
}

export interface TurmaComGrade {
  id: string;
  codigo: string;
  disciplinas: number;
}

/**
 * Turma sem grade montada.
 *
 * Sem vínculo o professor abre o diário vazio, a pauta sai sem colunas e o
 * boletim não tem disciplinas — e quem descobre é o professor, no dia da
 * aula. O painel descobre antes.
 */
export function turmasSemGrade(turmas: TurmaComGrade[]): TurmaComGrade[] {
  return turmas.filter((turma) => turma.disciplinas === 0);
}

export interface BoletimDoAluno {
  matricula: string;
  /** Os trimestres já liberados para a família. */
  liberados: string[];
}

/**
 * Quantos alunos ainda não tiveram o trimestre liberado.
 *
 * Enquanto não libera, a família não vê nota nenhuma — e a secretaria só
 * descobre que esqueceu quando a família liga.
 */
export function semTrimestreLiberado(
  boletins: BoletimDoAluno[],
  trimestre: string,
): BoletimDoAluno[] {
  return boletins.filter((boletim) => !boletim.liberados.includes(trimestre));
}
