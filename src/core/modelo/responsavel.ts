import { z } from "zod";

import { ENDERECO_VAZIO, enderecoSchema } from "@/core/modelo/aluno";
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
/**
 * O papel do responsável na vida escolar do aluno.
 *
 * A distinção existe porque as duas conversas são diferentes: boletim e
 * ocorrência vão para quem acompanha o estudo; mensalidade vai para quem
 * paga. Numa família separada, muitas vezes não é a mesma pessoa — e mandar
 * cobrança para quem não paga é o tipo de erro que a escola leva meses para
 * descobrir.
 */
export const tipoDeResponsavelSchema = z.enum([
  "academico",
  "financeiro",
  "ambos",
]);

export type TipoDeResponsavel = z.infer<typeof tipoDeResponsavelSchema>;

export const ROTULOS_DE_TIPO_DE_RESPONSAVEL: Record<TipoDeResponsavel, string> =
  {
    academico: "Acadêmico",
    financeiro: "Financeiro",
    ambos: "Acadêmico e financeiro",
  };

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
  /** `ambos` é o padrão: é o caso da maioria das famílias. */
  tipo: tipoDeResponsavelSchema.default("ambos"),
  /**
   * Endereço próprio.
   *
   * Em boa parte dos casos é o mesmo do aluno, e o formulário oferece
   * copiá-lo — mas guardar a cópia, em vez de apontar para o endereço do
   * aluno, é o que permite ao responsável mudar de casa sem mudar o
   * cadastro do filho.
   *
   * Tem `default` porque os 118 responsáveis vindos do Access não têm o
   * campo: sem ele, ler um cadastro antigo pelo schema falharia.
   */
  endereco: enderecoSchema.default(ENDERECO_VAZIO),
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
