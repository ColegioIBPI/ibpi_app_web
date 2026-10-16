import { z } from "zod";

import { anexoSchema } from "@/core/modelo/aviso";
import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  textoOpcional,
} from "@/core/modelo/comum";

/**
 * O boleto do aluno, em PDF.
 *
 * **Um por aluno.** Enviar outro substitui o anterior — é o boleto atual
 * que a família precisa, e uma lista de boletos antigos só criaria a
 * dúvida de qual pagar. O id do documento é a matrícula, o que torna a
 * regra estrutural em vez de uma validação que alguém pode esquecer.
 *
 * O arquivo não tem URL pública, como a foto do aluno e o comprovante de
 * 2ª chamada: um boleto traz nome, valor e linha digitável. Sai por rota
 * que confere quem está pedindo.
 */
export const boletoSchema = z.object({
  matricula: z.string().min(1),
  arquivo: anexoSchema,

  /** Recado curto da secretaria — "vencimento prorrogado para o dia 15". */
  observacoes: textoOpcional,

  atualizadoPorNome: z.string().optional(),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Boleto = z.infer<typeof boletoSchema>;
