import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
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
  "recusada",
  "cancelada",
]);

export type SituacaoDaSolicitacao = z.infer<typeof situacaoDaSolicitacaoSchema>;

export const ROTULOS_DE_SOLICITACAO: Record<SituacaoDaSolicitacao, string> = {
  aberta: "Aberta",
  "em-andamento": "Em andamento",
  pronta: "Pronta para retirada",
  entregue: "Entregue",
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
 * Saída antecipada e 2ª chamada entram aqui nas próximas entregas, como
 * novos membros da união — a fila, a regra e a tela já ficam prontas para
 * eles.
 */
export const solicitacaoSchema = z.discriminatedUnion("tipo", [
  solicitacaoDeDocumentacaoSchema,
]);

export type Solicitacao = z.infer<typeof solicitacaoSchema>;
