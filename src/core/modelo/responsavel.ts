import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  textoOpcional,
} from "@/core/modelo/comum";

/**
 * Responsável pelo aluno.
 *
 * No Access não havia tabela própria: o responsável vivia em colunas do
 * aluno (`Responsavel`/`Parentesco1` e `Responsavel1`/`Parentesco2`), o que
 * duplicava a mesma pessoa entre irmãos. Aqui ele é uma entidade, com
 * relação muitos-para-muitos: um responsável pode ter vários filhos, e um
 * aluno pode ter vários responsáveis com acessos independentes.
 */
export const responsavelSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  parentesco: textoOpcional,
  email: z.string().email("E-mail inválido").nullish(),
  /** Em E.164 (`+5521999998888`). */
  telefone: z.string().nullish(),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF tem 11 dígitos")
    .nullish(),
  /** Matrículas dos filhos. É o que define o escopo de acesso dele. */
  alunosVinculados: z.array(z.string()).default([]),
  /** `uid` da conta de acesso, quando a secretaria já a criou. */
  uid: z.string().nullish(),
  ativo: z.boolean().default(true),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Responsavel = z.infer<typeof responsavelSchema>;

export const responsavelEditavelSchema = responsavelSchema.omit({
  uid: true,
  origem: true,
  criadoEm: true,
  criadoPor: true,
  atualizadoEm: true,
  atualizadoPor: true,
});

export type ResponsavelEditavel = z.infer<typeof responsavelEditavelSchema>;
