import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  textoOpcional,
} from "@/core/modelo/comum";

/**
 * Conferência dos documentos que a família entrega na matrícula.
 *
 * É a lista que a secretaria hoje risca no papel. Ela não se confunde com
 * `documentosSolicitaveis`, que é o que a **escola emite** a pedido da
 * família — aqui é o caminho contrário: o que a **família traz** e a
 * escola confere.
 *
 * A lista é **fixa**, e não um catálogo que alguém cadastra. São os
 * documentos exigidos na matrícula, iguais para todo aluno; transformá-la
 * em cadastro abriria a porta para cada ano ter uma lista diferente e para
 * a conferência de um aluno não poder ser comparada com a de outro.
 */
export const tipoDeDocumentoEntregueSchema = z.enum([
  "historico-escolar-original",
  "certidao-de-nascimento",
  "rg-do-aluno",
  "cpf-do-aluno",
  "tipo-sanguineo",
  "rg-do-responsavel-financeiro",
  "cpf-do-responsavel-financeiro",
  "comprovante-de-residencia",
  "laudo-medico",
]);

export type TipoDeDocumentoEntregue = z.infer<
  typeof tipoDeDocumentoEntregueSchema
>;

/** Na ordem em que a secretaria confere. */
export const DOCUMENTOS_DA_MATRICULA: TipoDeDocumentoEntregue[] =
  tipoDeDocumentoEntregueSchema.options;

export const ROTULOS_DE_DOCUMENTO_ENTREGUE: Record<
  TipoDeDocumentoEntregue,
  string
> = {
  "historico-escolar-original": "Histórico Escolar Original",
  "certidao-de-nascimento": "Cópia Certidão de Nascimento",
  "rg-do-aluno": "Cópia RG Aluno",
  "cpf-do-aluno": "Cópia CPF Aluno",
  "tipo-sanguineo": "Tipo Sanguíneo",
  "rg-do-responsavel-financeiro": "Cópia do RG do Responsável Financeiro",
  "cpf-do-responsavel-financeiro": "Cópia do CPF do Responsável Financeiro",
  "comprovante-de-residencia":
    "Comprovante de Residência do Responsável Financeiro",
  "laudo-medico": "Laudo Médico",
};

/**
 * Nem todo aluno deve todo documento.
 *
 * Laudo médico só existe quando existe; exigi-lo de todos faria a lista
 * nunca fechar e ensinaria a secretaria a ignorar o que está em vermelho.
 */
export const OPCIONAIS: TipoDeDocumentoEntregue[] = ["laudo-medico"];

export const entregaSchema = z.object({
  entregue: z.boolean().default(false),
  /** Quando foi marcado. `null` enquanto não foi. */
  em: z.string().nullable().default(null),
  // `null`, e não ausente: o Firestore recusa `undefined`, e desmarcar
  // precisa de um valor que apague o nome de quem conferiu antes.
  porNome: z.string().nullable().default(null),
});

export type Entrega = z.infer<typeof entregaSchema>;

export const entregaDeDocumentosSchema = z.object({
  matricula: z.string().min(1),
  /**
   * Um registro por documento. Guardar o mapa inteiro, e não só a lista do
   * que foi entregue, é o que permite responder "quando a mãe trouxe o
   * histórico" — pergunta que aparece quando alguém diz que já entregou.
   */
  // `partialRecord`, e não `record`: um aluno recém-cadastrado não tem
  // marcação nenhuma, e `record` com chave de enum exigiria as nove.
  itens: z
    .partialRecord(tipoDeDocumentoEntregueSchema, entregaSchema)
    .default({}),
  /**
   * A pasta do aluno no Drive do colégio — só o **id**, nunca o link
   * inteiro (ver `features/alunos/domain/drive.ts`).
   *
   * Mora aqui, e não no cadastro do aluno, porque é a mesma coisa: a pasta
   * guarda os documentos da matrícula, e quem pode ver a conferência é
   * exatamente quem pode abrir a pasta. No cadastro, o professor leria.
   */
  pastaDoDrive: z.string().nullable().default(null),
  observacoes: textoOpcional,
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type EntregaDeDocumentos = z.infer<typeof entregaDeDocumentosSchema>;
