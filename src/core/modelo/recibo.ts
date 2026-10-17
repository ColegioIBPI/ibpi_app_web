import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  segmentoSchema,
  textoOpcional,
} from "@/core/modelo/comum";

/**
 * Recibo emitido pelo colégio.
 *
 * É o papel que a família leva embora. Isso decide quase tudo aqui:
 *
 * - **Recibo não se edita, se cancela.** Corrigir um recibo já entregue
 *   faria o papel na mão da família discordar do sistema, e a conferência
 *   de caixa passaria a depender de qual dos dois alguém olhou primeiro.
 *   Errou, cancela e emite outro — e os dois ficam no histórico.
 * - **Os dados do aluno são cópia, não ponteiro.** O recibo de março mostra
 *   o nome e a série que o aluno tinha em março, mesmo que ele se transfira
 *   em junho ou o nome seja corrigido depois.
 * - **O número é sequencial por série** e não se repete, porque é por ele
 *   que o recibo é procurado quando a família reclama.
 */

/**
 * O que foi cobrado.
 *
 * **Vocabulário próprio, maior que o de `cobrancas`.** Metade desta lista
 * não é parcela de carnê: declaração, 2ª via de histórico, taxa de
 * publicação no D.O. Forçar os dois a usarem o mesmo enum obrigaria a
 * inventar "Taxa de formatura" como tipo de mensalidade — ou a deixar o
 * recibo sem metade do que o colégio de fato cobra.
 */
export const tipoDeServicoSchema = z.enum([
  "taxa-de-matricula",
  "taxa-de-material",
  "mensalidade",
  "reclassificacao",
  "dependencia",
  "adaptacao",
  "aula-extra",
  "segunda-chamada",
  "declaracao",
  "segunda-via-de-historico",
  "segunda-via-de-certificado",
  "taxa-de-publicacao-do",
  "taxa-de-formatura",
  "outros",
]);

export type TipoDeServico = z.infer<typeof tipoDeServicoSchema>;

/** Na ordem em que aparecem na caixa suspensa. */
export const SERVICOS = tipoDeServicoSchema.options;

export const ROTULOS_DE_SERVICO: Record<TipoDeServico, string> = {
  "taxa-de-matricula": "Taxa de Matrícula",
  "taxa-de-material": "Taxa de Material",
  mensalidade: "Mensalidade",
  reclassificacao: "Reclassificação",
  dependencia: "Dependências",
  adaptacao: "Adaptação",
  "aula-extra": "Aula Extra",
  "segunda-chamada": "2ª Chamada",
  declaracao: "Declaração",
  "segunda-via-de-historico": "2ª via de Histórico Escolar",
  "segunda-via-de-certificado": "2ª via de Certificado de Conclusão",
  "taxa-de-publicacao-do": "Taxa de Publicação D.O.",
  "taxa-de-formatura": "Taxa de Formatura",
  outros: "Outros",
};

/**
 * Como foi pago.
 *
 * **Mais fino que o de `cobrancas`**, que para por "cartão de débito". Aqui
 * a bandeira entra porque é ela que aparece no extrato da maquininha: sem
 * distinguir Visa de Master, conferir o fechamento do dia obriga a abrir
 * recibo por recibo.
 */
export const formaDePagamentoDoReciboSchema = z.enum([
  "pix",
  "dinheiro",
  "boleto",
  "link-de-pagamento",
  "debito-master",
  "debito-visa",
  "debito-outro",
  "credito-visa",
  "credito-master",
  "credito-outro",
]);

export type FormaDePagamentoDoRecibo = z.infer<
  typeof formaDePagamentoDoReciboSchema
>;

export const FORMAS_DE_PAGAMENTO_DO_RECIBO =
  formaDePagamentoDoReciboSchema.options;

export const ROTULOS_DE_FORMA_DO_RECIBO: Record<
  FormaDePagamentoDoRecibo,
  string
> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
  "link-de-pagamento": "Link de Pagamento",
  "debito-master": "Cartão de Débito Master",
  "debito-visa": "Cartão de Débito Visa",
  "debito-outro": "Cartão de Débito Outro",
  "credito-visa": "Cartão de Crédito Visa",
  "credito-master": "Cartão de Crédito Master",
  "credito-outro": "Cartão de Crédito Outro",
};

export const statusDoReciboSchema = z.enum(["confirmado", "cancelado"]);

export type StatusDoRecibo = z.infer<typeof statusDoReciboSchema>;

export const ROTULOS_DE_STATUS_DO_RECIBO: Record<StatusDoRecibo, string> = {
  confirmado: "Confirmado",
  cancelado: "Cancelado",
};

export const itemDoReciboSchema = z.object({
  servico: tipoDeServicoSchema,
  /**
   * A parcela que este item quita, quando quita alguma.
   *
   * `null` na maior parte dos itens: declaração, 2ª via e taxa de formatura
   * não nascem de carnê nenhum. Quando preenchido, a emissão dá baixa na
   * parcela dentro da **mesma transação** — emitir recibo de mensalidade
   * **é** dar baixa nela, e lançar as duas coisas em separado é como o
   * extrato acaba cobrando de novo quem já pagou.
   */
  cobrancaId: z.string().nullable().default(null),
  /** A que se refere: `Parcela 5/12`, `Fevereiro/2026`, `2º bimestre`. */
  referencia: textoOpcional,
  formaDePagamento: formaDePagamentoDoReciboSchema,
  /** Número ou código do pagamento: NSU da maquininha, id do PIX. */
  referenciaDoPagamento: textoOpcional,
  /** Em reais. A soma é feita em centavos — ver `domain/recibo.ts`. */
  valor: z.number().positive("O valor do item precisa ser maior que zero"),
});

export type ItemDoRecibo = z.infer<typeof itemDoReciboSchema>;

/**
 * Os dados do aluno **no dia da emissão**.
 *
 * Cópia deliberada. Um recibo que buscasse o nome no cadastro mudaria
 * sozinho quando o aluno trocasse de série no ano seguinte, e a 2ª via
 * sairia diferente da 1ª — que é justamente a que a família tem guardada.
 */
export const alunoDoReciboSchema = z.object({
  matricula: z.string().min(1),
  nome: z.string().min(1),
  /** O segmento: Ensino Fundamental, Ensino Médio, EJA. */
  curso: segmentoSchema.nullable().default(null),
  /** A série do aluno — não confundir com a série do talão de recibos. */
  serie: textoOpcional,
});

export const cancelamentoSchema = z.object({
  em: z.string(),
  porNome: z.string(),
  /**
   * Obrigatório: recibo cancelado sem motivo vira dúvida no fechamento do
   * caixa, e quem cancelou raramente está por perto quando a dúvida chega.
   */
  motivo: z.string().trim().min(3, "Diga por que o recibo foi cancelado"),
});

export type Cancelamento = z.infer<typeof cancelamentoSchema>;

export const reciboSchema = z.object({
  /** A série do talão: `A`, `B`, `2026`. */
  serie: z.string().trim().min(1).max(10),
  numero: z.number().int().positive(),
  status: statusDoReciboSchema.default("confirmado"),
  /** Quem emitiu — vem da sessão, não é digitado. */
  emissorUid: z.string().min(1),
  emissorNome: z.string().min(1),
  emitidoEm: z.string(),
  aluno: alunoDoReciboSchema,
  itens: z.array(itemDoReciboSchema).min(1, "O recibo precisa de pelo menos um item"),
  observacoes: textoOpcional,
  /** `null` enquanto o recibo vale. */
  cancelamento: cancelamentoSchema.nullable().default(null),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Recibo = z.infer<typeof reciboSchema>;

export type ReciboComId = Recibo & { id: string };

/**
 * O talão: uma série e o próximo número dela.
 *
 * Documento à parte do recibo porque é **contador**, e contador precisa ser
 * lido e escrito em transação. O colégio informa o último número usado no
 * papel ao abrir a série, para o sistema não emitir um nº 1 que já existe
 * numa gaveta.
 */
export const serieDeRecibosSchema = z.object({
  serie: z.string().trim().min(1).max(10),
  descricao: textoOpcional,
  proximoNumero: z.number().int().positive(),
  ativa: z.boolean().default(true),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type SerieDeRecibos = z.infer<typeof serieDeRecibosSchema>;
