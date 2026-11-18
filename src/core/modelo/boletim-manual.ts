import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  textoOpcional,
} from "@/core/modelo/comum";
import {
  linhaDoBoletimSchema,
  situacaoFinalSchema,
} from "@/core/modelo/nota";

/**
 * O **boletim 2**: uma cópia do boletim calculado, com valores fixos.
 *
 * O boletim normal é derivado — ele se refaz a cada leitura a partir das
 * notas que os professores lançam, e é isso que faz uma correção aparecer
 * na hora. Este aqui é o contrário de propósito: nasce como **retrato** do
 * calculado e, a partir daí, **nada mais o recalcula**. O valor que a
 * secretaria digitar é o valor que sai no papel.
 *
 * Existe porque há casos em que o número do boletim não é o número que a
 * conta dá: aluno que chega transferido com notas de outra escola,
 * adaptação curricular, decisão de conselho de classe. Hoje isso é
 * resolvido fora do sistema, e o que a família recebe deixa de ter origem.
 *
 * **Guarda as mesmas linhas do calculado** (`LinhaDoBoletim`), e não um
 * formato próprio. É o que permite o mesmo componente imprimir os dois —
 * dois formatos de boletim é como os dois acabam divergindo no detalhe
 * que ninguém conferiu.
 */

/**
 * As colunas que a secretaria pode renomear ou esconder.
 *
 * `disciplina` e `faltas` entram porque são rótulos do mesmo quadro, e
 * quem renomeia "AV" costuma querer renomear o resto junto.
 */
export const COLUNAS_DO_BOLETIM = [
  "disciplina",
  "projeto",
  "tarefas",
  "av",
  "media",
  "total",
  "recuperacao",
  "mediaFinal",
  "situacao",
  "faltas",
] as const;

export type ColunaDoBoletim = (typeof COLUNAS_DO_BOLETIM)[number];

/** O que o boletim do colégio imprime hoje. A cópia nasce com isto. */
export const ROTULOS_PADRAO_DO_BOLETIM: Record<ColunaDoBoletim, string> = {
  disciplina: "DISCIPLINA",
  projeto: "PROJETO",
  tarefas: "TAREFAS",
  av: "AV",
  media: "MÉDIA",
  total: "TOTAL",
  recuperacao: "REC",
  mediaFinal: "MÉDIA",
  situacao: "SITUAÇÃO",
  faltas: "Faltas",
};

/**
 * Colunas que não se escondem.
 *
 * Sem disciplina o quadro não diz de que matéria é a linha; sem média do
 * trimestre e sem média final, o boletim deixa de ser boletim. O resto a
 * secretaria decide.
 */
export const COLUNAS_OBRIGATORIAS: ColunaDoBoletim[] = [
  "disciplina",
  "media",
  "mediaFinal",
];

export const boletimManualSchema = z.object({
  anoLetivo: z.number().int(),
  matricula: z.string().min(1),
  nome: z.string().optional(),
  turmaId: z.string().nullish(),
  turmaCodigo: z.string().nullish(),
  segmentoRotulo: z.string().nullish(),
  serie: z.string().nullish(),
  dataMatricula: z.string().nullish(),

  /** Como este boletim se chama na tela da secretaria. */
  titulo: z.string().trim().min(1).default("Boletim 2"),

  /**
   * **O que a família vê.**
   *
   * Marcado, este boletim substitui o calculado no Portal e na impressão,
   * e é o único que o aluno e o responsável enxergam. Desmarcado, ele
   * existe só para a equipe.
   *
   * É também o ato de liberação deste documento: o calculado tem a
   * liberação por trimestre, e este, que é do ano inteiro e escrito à
   * mão, tem esta caixa.
   */
  oficial: z.boolean().default(false),

  /** Rótulo de cada coluna. Ausente usa o padrão do colégio. */
  rotulos: z.partialRecord(z.enum(COLUNAS_DO_BOLETIM), z.string().trim().min(1)).default({}),
  /** Colunas escondidas na tela e no papel. */
  ocultas: z.array(z.enum(COLUNAS_DO_BOLETIM)).default([]),

  /** As linhas, com os valores fixos. Mesma forma do boletim calculado. */
  disciplinas: z.array(linhaDoBoletimSchema).default([]),
  faltasPorTrimestre: z.record(z.string(), z.number().int()).default({}),
  percentualDeFrequencia: z.number().min(0).max(1).nullable().default(null),
  situacao: situacaoFinalSchema.default("cursando"),
  observacoes: textoOpcional,

  /** Quando o retrato foi tirado, e de quem. */
  copiadoEm: z.string(),
  copiadoPorNome: z.string().nullable().default(null),

  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type BoletimManual = z.infer<typeof boletimManualSchema>;

/** Um por aluno e ano letivo. */
export function idDoBoletimManual(
  anoLetivo: number,
  matricula: string,
): string {
  return `${anoLetivo}-${matricula}`;
}
