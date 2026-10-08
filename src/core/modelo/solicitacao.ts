import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  dataSchema,
  origemSchema,
  textoOpcional,
} from "@/core/modelo/comum";

/**
 * Pedidos que a família faz à secretaria.
 *
 * Três tipos, com campos diferentes e a mesma fila: documentação, saída
 * antecipada e 2ª chamada. Uma coleção só, discriminada por `tipo` — a
 * secretaria atende os três no mesmo lugar, e separar em três coleções
 * significaria três filas, três regras e três telas dizendo a mesma coisa.
 *
 * **Quem abre é o responsável.** O aluno é menor de idade, e o pedido é um
 * ato do adulto por ele.
 */

/**
 * A situação é **gravada**, ao contrário da situação de uma cobrança.
 *
 * Lá, "vencida" é uma conclusão sobre hoje e envelhece sozinha. Aqui é o
 * registro de um ato humano: alguém da secretaria pegou o pedido, alguém o
 * deixou pronto, alguém o entregou. Isso não se deduz de data nenhuma — e
 * se não for gravado, se perde.
 */
export const situacaoDaSolicitacaoSchema = z.enum([
  "aberta",
  "em-andamento",
  "pronta",
  "entregue",
  "autorizada",
  "recusada",
  "cancelada",
]);

export type SituacaoDaSolicitacao = z.infer<typeof situacaoDaSolicitacaoSchema>;

export const ROTULOS_DE_SOLICITACAO: Record<SituacaoDaSolicitacao, string> = {
  aberta: "Aberta",
  "em-andamento": "Em andamento",
  pronta: "Pronta para retirada",
  entregue: "Entregue",
  autorizada: "Autorizada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

export const tipoDeSolicitacaoSchema = z.enum([
  "documentacao",
  "saida-antecipada",
  "segunda-chamada",
]);

export type TipoDeSolicitacao = z.infer<typeof tipoDeSolicitacaoSchema>;

export const ROTULOS_DE_TIPO_DE_SOLICITACAO: Record<TipoDeSolicitacao, string> =
  {
    documentacao: "Documentação",
    "saida-antecipada": "Saída antecipada",
    "segunda-chamada": "2ª chamada",
  };

/**
 * Cada passo da fila, com quem deu o passo.
 *
 * O histórico é o que permite responder "desde quando está em andamento" e
 * "quem recusou, e por quê" — perguntas que aparecem justamente quando a
 * família reclama, e que a situação atual sozinha não responde.
 */
export const passoDaSolicitacaoSchema = z.object({
  situacao: situacaoDaSolicitacaoSchema,
  em: z.string(),
  porUid: z.string().min(1),
  porNome: z.string().optional(),
  /** Obrigatório ao recusar; opcional no resto. */
  motivo: textoOpcional,
});

export type PassoDaSolicitacao = z.infer<typeof passoDaSolicitacaoSchema>;

/** O que todo pedido tem, seja qual for o tipo. */
const baseDaSolicitacao = {
  /** O aluno a quem o pedido se refere. */
  matricula: z.string().min(1),
  alunoNome: z.string().min(1),
  turmaCodigo: textoOpcional,

  /** Quem abriu — sempre um responsável. */
  solicitanteUid: z.string().min(1),
  solicitanteNome: z.string().min(1),

  situacao: situacaoDaSolicitacaoSchema.default("aberta"),
  historico: z.array(passoDaSolicitacaoSchema).default([]),

  /** Recado da família no momento do pedido. */
  observacoes: textoOpcional,

  abertaEm: z.string(),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
};

export const solicitacaoDeDocumentacaoSchema = z.object({
  tipo: z.literal("documentacao"),
  ...baseDaSolicitacao,

  /** Qual item do catálogo. */
  documentoId: z.string().min(1),

  /**
   * O nome do documento **no momento do pedido**, copiado do catálogo.
   *
   * Sem esta cópia, renomear "Declaração de matrícula" para outra coisa
   * reescreveria o que a família pediu no mês passado. O pedido guarda o
   * que foi pedido; o catálogo guarda o que se oferece hoje.
   */
  documentoNome: z.string().min(1),
});

export type SolicitacaoDeDocumentacao = z.infer<
  typeof solicitacaoDeDocumentacaoSchema
>;

/**
 * Quem vem buscar o aluno.
 *
 * O CPF é pedido porque quem recebe na portaria não conhece a família de
 * vista, e "a tia da Maria" não é identificação. Mesmo formato de onze
 * dígitos do resto do sistema.
 */
export const acompanhanteSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome de quem vem buscar"),
  cpf: z.string().regex(/^\d{11}$/, "CPF tem 11 dígitos"),
});

export type Acompanhante = z.infer<typeof acompanhanteSchema>;

export const solicitacaoDeSaidaAntecipadaSchema = z.object({
  tipo: z.literal("saida-antecipada"),
  ...baseDaSolicitacao,

  data: dataSchema,
  /** Hora da saída, `HH:MM` em 24 horas. */
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:MM"),

  /**
   * Obrigatório, ao contrário das observações dos outros tipos: a
   * coordenação autoriza ou não **com base nele**, e "motivo: —" devolve a
   * decisão para um telefonema.
   */
  motivo: z.string().trim().min(3, "Informe o motivo da saída"),

  acompanhada: z.boolean(),
  acompanhante: acompanhanteSchema.nullable().default(null),
});

/**
 * A regra que dá sentido ao par de campos.
 *
 * Dizer que alguém vem buscar sem dizer quem deixa a portaria sem saber a
 * quem entregar o aluno — que é exatamente o risco que o campo existe para
 * cobrir.
 *
 * Mora fora do schema, como função, porque `superRefine` devolve um
 * `ZodEffects` e tiraria o tipo da união discriminada. Quem valida o
 * formulário chama esta função; o documento gravado passa pelo schema puro.
 */
export function faltaAcompanhante(dados: {
  acompanhada: boolean;
  acompanhante?: Acompanhante | null;
}): boolean {
  return dados.acompanhada && !dados.acompanhante;
}

export type SolicitacaoDeSaidaAntecipada = z.infer<
  typeof solicitacaoDeSaidaAntecipadaSchema
>;

/**
 * A 2ª chamada entra aqui na próxima entrega, como mais um membro da
 * união — a fila, a regra e as telas já ficam prontas para ela.
 */
export const solicitacaoSchema = z.discriminatedUnion("tipo", [
  solicitacaoDeDocumentacaoSchema,
  solicitacaoDeSaidaAntecipadaSchema,
]);

export type Solicitacao = z.infer<typeof solicitacaoSchema>;
