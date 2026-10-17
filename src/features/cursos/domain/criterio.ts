import type { CriterioDeAvaliacao } from "@/core/modelo";

/**
 * Qual critério vale para um aluno.
 *
 * O colégio pode publicar um critério geral do ano e, além dele, um
 * específico de um curso — o EJA costuma ter regra própria. Escolher entre
 * os dois é regra de negócio, e por isso mora aqui e não na tela: a mesma
 * escolha é feita no Portal da família e em qualquer lugar que venha a
 * mostrar o critério depois.
 */

export type ParaEscolher = Pick<
  CriterioDeAvaliacao,
  "anoLetivo" | "cursoCodigo" | "publicado"
>;

/**
 * O do curso ganha do geral.
 *
 * Se o colégio se deu ao trabalho de publicar um critério só para o EJA, é
 * porque o geral não se aplica ali. Preferir o geral tornaria o específico
 * invisível justamente para quem ele foi escrito.
 */
export function criterioQueVale<T extends ParaEscolher>(
  criterios: T[],
  anoLetivo: number,
  cursoCodigo: string | null | undefined,
  /**
   * A família só lê o publicado. A equipe lê o rascunho — é ela que o
   * discute antes de virar comunicado.
   */
  apenasPublicados = true,
): T | null {
  const doAno = criterios.filter(
    (criterio) =>
      criterio.anoLetivo === anoLetivo &&
      (!apenasPublicados || criterio.publicado),
  );

  const doCurso =
    cursoCodigo &&
    doAno.find((criterio) => criterio.cursoCodigo === cursoCodigo);

  return doCurso || doAno.find((criterio) => !criterio.cursoCodigo) || null;
}

/**
 * O resumo de uma linha, para o cabeçalho do boletim.
 *
 * Até aqui essa frase estava escrita à mão na tela do Portal — "Média do
 * trimestre = (Projeto + Tarefas + AV) ÷ 3. Aprovação com média 5,0 e
 * frequência de 75%." —, e mudaria de verdade só no dia em que alguém
 * lembrasse de editar o código.
 */
export function resumoDoCriterio(
  criterio: Pick<
    CriterioDeAvaliacao,
    "periodos" | "nomeDoPeriodo" | "avaliacoes" | "mediaMinima" | "frequenciaMinima"
  >,
): string {
  const periodos = `${criterio.periodos} ${
    criterio.periodos === 1
      ? criterio.nomeDoPeriodo.toLowerCase()
      : `${criterio.nomeDoPeriodo.toLowerCase()}s`
  }`;

  const avaliacoes = criterio.avaliacoes.map((avaliacao) => avaliacao.nome);

  const composicao =
    avaliacoes.length > 0 ? ` · ${avaliacoes.join(" + ")}` : "";

  return (
    `${periodos}${composicao} · aprovação com média ` +
    `${formatarNota(criterio.mediaMinima)} e frequência de ` +
    `${formatarPercentual(criterio.frequenciaMinima)}`
  );
}

/** `5` → `5,0`; `6.5` → `6,5`. */
function formatarNota(valor: number): string {
  return valor.toFixed(1).replace(".", ",");
}

/** `75` → `75%`; `72.5` → `72,5%`. */
function formatarPercentual(valor: number): string {
  return `${String(valor).replace(".", ",")}%`;
}

export interface GrupoDeCriterio<T> {
  criterio: T;
  /** Os cursos dos filhos que este critério cobre, para rotular. */
  cursos: string[];
}

/**
 * Agrupa os critérios dos filhos de uma família.
 *
 * Quase sempre devolve um só: os irmãos estudam no mesmo colégio sob a
 * mesma regra. Mas uma família pode ter um filho no EJA e outro no médio
 * com critérios diferentes, e aí mostrar só o primeiro esconderia metade da
 * resposta — enquanto repetir o mesmo critério uma vez por filho encheria a
 * tela de texto idêntico.
 *
 * O rótulo do curso vem junto para a tela poder dizer a qual filho cada
 * critério se aplica **quando houver mais de um**.
 */
export function agruparCriterios<T extends { id: string }>(
  itens: Array<{ cursoRotulo: string; criterio: T | null }>,
): Array<GrupoDeCriterio<T>> {
  const grupos = new Map<string, GrupoDeCriterio<T>>();

  for (const item of itens) {
    if (!item.criterio) continue;

    const grupo = grupos.get(item.criterio.id);

    if (!grupo) {
      grupos.set(item.criterio.id, {
        criterio: item.criterio,
        cursos: [item.cursoRotulo],
      });
      continue;
    }

    // Dois filhos no mesmo curso não repetem o rótulo.
    if (!grupo.cursos.includes(item.cursoRotulo)) {
      grupo.cursos.push(item.cursoRotulo);
    }
  }

  return [...grupos.values()];
}
