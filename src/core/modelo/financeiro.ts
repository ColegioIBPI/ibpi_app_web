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

export const situacaoDaCobrancaSchema = z.enum([
  "aberta",
  "a-confirmar",
  "paga",
  "vencida",
]);

export type SituacaoDaCobranca = z.infer<typeof situacaoDaCobrancaSchema>;

export const ROTULOS_DE_COBRANCA: Record<SituacaoDaCobranca, string> = {
  aberta: "Em aberto",
  "a-confirmar": "A confirmar",
  paga: "Paga",
  vencida: "Vencida",
};

/**
 * O que a parcela cobra.
 *
 * É a "descrição do pagamento" do carnê. Não se confunde com
 * `tipoDeContrato`, que descreve o que foi **contratado** no ano: a anuidade
 * é um contrato e vira doze mensalidades, e "extras" é uma cobrança que não
 * nasce de contrato nenhum.
 */
export const tipoDeCobrancaSchema = z.enum([
  "taxa-de-matricula",
  "taxa-de-material",
  "mensalidade",
  "reclassificacao",
  "dependencia",
  "extras",
  "outros",
]);

export type TipoDeCobranca = z.infer<typeof tipoDeCobrancaSchema>;

export const ROTULOS_DE_TIPO_DE_COBRANCA: Record<TipoDeCobranca, string> = {
  "taxa-de-matricula": "Taxa de matrícula",
  "taxa-de-material": "Taxa de material",
  mensalidade: "Mensalidade",
  reclassificacao: "Reclassificação",
  dependencia: "Dependências",
  extras: "Extras",
  outros: "Outros",
};

/** Como a família pagou. Registrado na baixa, não antes dela. */
export const formaDePagamentoSchema = z.enum([
  "pix",
  "dinheiro",
  "boleto",
  "link-de-pagamento",
  "cartao-de-debito",
  "cartao-de-credito",
]);

export type FormaDePagamento = z.infer<typeof formaDePagamentoSchema>;

export const ROTULOS_DE_FORMA_DE_PAGAMENTO: Record<FormaDePagamento, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
  "link-de-pagamento": "Link de pagamento",
  "cartao-de-debito": "Cartão de débito",
  "cartao-de-credito": "Cartão de crédito",
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
  /**
   * O que a parcela cobra.
   *
   * `nullish` porque as 847 parcelas migradas não trazem essa informação: o
   * Access só guardava valor e vencimento. Tratar ausência como "mensalidade"
   * inventaria um dado que ninguém conferiu.
   */
  tipo: tipoDeCobrancaSchema.nullish(),
  /** Número da parcela e total — `3/12` na origem. */
  parcela: z.number().int().positive().nullish(),
  totalDeParcelas: z.number().int().positive().nullish(),
  valor: z.number().nullable(),
  valorPago: z.number().nullable(),
  dataPagamento: dataSchema.nullish(),
  /** Como a família pagou. Só faz sentido junto com `dataPagamento`. */
  formaDePagamento: formaDePagamentoSchema.nullish(),
  /**
   * Conferência do pagamento — o dinheiro caiu mesmo.
   *
   * `nullish` é "não se aplica ou veio do sistema antigo", e conta como
   * confirmado: as parcelas migradas já estavam quitadas no Access, e
   * mostrá-las de repente como pendentes de conferência seria inventar
   * 800 pendências que não existem. Só o `false` **explícito** — a caixa
   * desmarcada na baixa — significa "ainda não confirmei".
   */
  confirmado: z.boolean().nullish(),
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
 * O plano de pagamento acordado no ato da matrícula.
 *
 * Um texto livre por aluno, escrito pela secretaria: "12x de R$ 1.923,00 no
 * cartão, primeira em 05/02; desconto de 10% para pagamento até o dia 5".
 *
 * É **texto de propósito**. A negociação de uma matrícula tem condição,
 * desconto, exceção e combinado verbal, e todo campo estruturado que se
 * tentasse criar para isso ou não caberia no caso seguinte ou viraria um
 * "observações" com outro nome. O carnê — que é o que o sistema precisa
 * calcular — vive em `cobrancas`; aqui fica o que foi combinado, para quem
 * for atender a família depois saber o que a escola prometeu.
 *
 * Um documento por aluno: o id é a matrícula.
 */
export const planoDePagamentoSchema = z.object({
  matricula: z.string().min(1),
  texto: z.string().trim().min(1, "Escreva o plano acordado"),
  /**
   * Nome de quem escreveu, para a tela não precisar resolver o `uid`.
   * O `uid` e a data vêm de `atualizadoPor` e `atualizadoEm`, que
   * `gravarComAuditoria` preenche sozinho.
   */
  atualizadoPorNome: z.string().optional(),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type PlanoDePagamento = z.infer<typeof planoDePagamentoSchema>;

/**
 * Anotação interna do financeiro sobre um aluno.
 *
 * "Ligar dia 10", "pai pediu prazo até a folha", "mãe pede para falar só
 * com ela". É o que a equipe precisa lembrar para atender bem, e o que a
 * família **não** pode ler.
 *
 * Por isso é uma **coleção separada** de `planosDePagamento`, e não mais um
 * campo dentro dele: Security Rule do Firestore decide por documento, nunca
 * por campo. Guardar os dois juntos significaria escolher entre o
 * responsável ler o recado interno ou não ler o próprio plano — e a
 * separação é o único jeito de ter as duas coisas.
 *
 * Um documento por aluno: o id é a matrícula.
 */
export const anotacaoFinanceiraSchema = z.object({
  matricula: z.string().min(1),
  texto: z.string().trim().min(1, "Escreva a anotação"),
  atualizadoPorNome: z.string().optional(),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type AnotacaoFinanceira = z.infer<typeof anotacaoFinanceiraSchema>;

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
