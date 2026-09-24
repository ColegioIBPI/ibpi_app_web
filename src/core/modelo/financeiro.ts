import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  dataSchema,
  origemSchema,
  textoOpcional,
} from "@/core/modelo/comum";

/**
 * Financeiro — controle interno, sem gateway de pagamento.
 *
 * Duas coleções, com os campos das duas tabelas de origem:
 *
 * - `cobrancas` ← `Tabela_pagamento` (Matricula, Vencimento, QTDE de
 *   Parcelas, Valor, Data Pagamento, Valor Pago, No Banco, No IBPI,
 *   Observações).
 * - `contratos` ← `Fatos` (Matricula, DataOcor, Tipo, Ocorrencia) — os itens
 *   contratados do ano, apesar do nome da tabela sugerir outra coisa.
 */

export const situacaoDaCobrancaSchema = z.enum(["aberta", "paga", "vencida"]);

export type SituacaoDaCobranca = z.infer<typeof situacaoDaCobrancaSchema>;

export const ROTULOS_DE_COBRANCA: Record<SituacaoDaCobranca, string> = {
  aberta: "Em aberto",
  paga: "Paga",
  vencida: "Vencida",
};

/**
 * Uma parcela.
 *
 * **A situação não é gravada.** "Vencida" é uma conclusão sobre hoje, não um
 * dado: uma parcela salva como "em aberto" em abril continuaria assim em
 * dezembro, muito depois de vencer. O que se guarda são os fatos —
 * vencimento e pagamento — e `situacaoDaCobranca()` conclui a partir deles
 * a cada leitura (ver `features/financeiro/domain/cobranca.ts`).
 */
export const cobrancaSchema = z.object({
  matricula: z.string().min(1),
  vencimento: dataSchema,
  /** Número da parcela e total — `3/12` na origem. */
  parcela: z.number().int().positive().nullish(),
  totalDeParcelas: z.number().int().positive().nullish(),
  valor: z.number().nullable(),
  valorPago: z.number().nullable(),
  dataPagamento: dataSchema.nullish(),
  /** `No Banco` e `No IBPI` do Access: por onde a cobrança foi emitida. */
  emitidaPeloBanco: z.boolean().nullish(),
  emitidaPeloColegio: z.boolean().nullish(),
  /** Banco e recibo da baixa manual (`ITAÚ`, `00042981`). */
  banco: textoOpcional,
  recibo: textoOpcional,
  observacoes: textoOpcional,
  /** `uid` de quem deu baixa — contestação de cobrança precisa de autor. */
  baixadoPor: z.string().nullish(),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Cobranca = z.infer<typeof cobrancaSchema>;

export const tipoDeContratoSchema = z.enum([
  "anuidade",
  "matricula",
  "taxa-material",
  "dependencia",
  "reclassificacao",
  "outros",
]);

export type TipoDeContrato = z.infer<typeof tipoDeContratoSchema>;

export const ROTULOS_DE_CONTRATO: Record<TipoDeContrato, string> = {
  anuidade: "Anuidade",
  matricula: "Matrícula",
  "taxa-material": "Taxa de material",
  dependencia: "Dependência",
  reclassificacao: "Reclassificação",
  outros: "Outros",
};

export const contratoSchema = z.object({
  matricula: z.string().min(1),
  data: dataSchema.nullish(),
  tipo: tipoDeContratoSchema,
  valor: z.number().nullable(),
  parcelas: z.number().int().positive().nullable(),
  plano: textoOpcional,
  /**
   * O texto original do Access (`12XR$1.923,00 Plano Cartão`), sempre
   * preservado: nenhuma interpretação de campo livre é confiável o bastante
   * para apagar a origem.
   */
  descricao: z.string(),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Contrato = z.infer<typeof contratoSchema>;

/**
 * Trilha de auditoria.
 *
 * O Access tem uma tabela `log`, vazia — a intenção existia e nunca foi
 * usada. Aqui ela é obrigatória em nota, frequência e financeiro: é o que
 * permite ao colégio responder quando uma família contesta.
 */
export const registroDeAuditoriaSchema = z.object({
  colecao: z.string(),
  documentoId: z.string(),
  acao: z.enum(["criou", "alterou", "removeu"]),
  /** Só os campos que mudaram, com valor antes e depois. */
  alteracoes: z
    .record(
      z.string(),
      z.object({ de: z.unknown().nullish(), para: z.unknown().nullish() }),
    )
    .default({}),
  autorUid: z.string(),
  autorNome: z.string().optional(),
  autorPerfil: z.string().optional(),
  em: z.string(),
});

export type RegistroDeAuditoria = z.infer<typeof registroDeAuditoriaSchema>;
