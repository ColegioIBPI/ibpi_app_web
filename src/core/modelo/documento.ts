import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  textoOpcional,
} from "@/core/modelo/comum";

/**
 * Catálogo de documentos que a secretaria emite.
 *
 * É a lista de onde a família escolhe ao pedir uma declaração — matrícula,
 * frequência, conclusão, histórico. **Não** é arquivo de aluno: o RG
 * digitalizado e o comprovante de residência são outra coisa, e por isso a
 * coleção se chama `documentosSolicitaveis` e não `documentos`.
 *
 * O catálogo existe separado do pedido pela mesma razão que a lista de
 * disciplinas existe separada da nota: a secretaria muda o que oferece sem
 * mexer no que já foi pedido, e um pedido antigo continua dizendo o que foi
 * pedido mesmo depois de o item sair do catálogo.
 */
export const documentoSolicitavelSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do documento"),

  /** Para que serve, em uma linha. Ajuda quem não conhece o nome formal. */
  descricao: textoOpcional,

  /**
   * Prazo de entrega, em dias úteis.
   *
   * `null` é "sem prazo definido", e não zero: zero significaria pronto na
   * hora, que é uma promessa diferente de não ter promessa nenhuma.
   */
  prazoEmDiasUteis: z.number().int().min(0).nullable().default(null),

  /** Em reais. `null` é gratuito. */
  valor: z.number().min(0).nullable().default(null),

  /**
   * O pedido só é aceito com comprovante de pagamento anexado.
   *
   * Separado de `valor` de propósito: há documento cobrado que a família
   * paga na secretaria, em dinheiro, sem comprovante nenhum para anexar.
   * Deduzir um do outro erraria nesse caso.
   */
  exigeComprovante: z.boolean().default(false),

  /** Posição na lista. Valores de 10 em 10, como as disciplinas. */
  ordem: z.number().int().default(0),

  /**
   * Fora do ar some da lista da família e continua existindo para a
   * secretaria — e para os pedidos antigos, que continuam legíveis.
   */
  ativo: z.boolean().default(true),

  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type DocumentoSolicitavel = z.infer<typeof documentoSolicitavelSchema>;
