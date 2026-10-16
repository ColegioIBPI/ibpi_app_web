import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  dataSchema,
  origemSchema,
  segmentoSchema,
  textoOpcional,
  turnoSchema,
} from "@/core/modelo/comum";

/**
 * Cadastro do aluno.
 *
 * Reorganiza em blocos os ~100 campos da `Tabela_Aluno` do Access. Nada foi
 * descartado: o que a secretaria preenchia continua tendo onde morar, porque
 * documento escolar é justamente o tipo de dado que só faz falta no dia em
 * que alguém pede a segunda via.
 */

export const enderecoSchema = z.object({
  logradouro: textoOpcional,
  complemento: textoOpcional,
  bairro: textoOpcional,
  cidade: textoOpcional,
  uf: z
    .string()
    .trim()
    .length(2, "UF tem 2 letras")
    .toUpperCase()
    .nullish()
    .transform((v) => v || null),
  cep: textoOpcional,
});

/**
 * Endereço em branco — todos os campos nulos.
 *
 * Existe porque o Zod 4 exige que o `default` de um objeto seja o valor de
 * **saída**, já com os nulos, e não um `{}`.
 */
export const ENDERECO_VAZIO = {
  logradouro: null,
  complemento: null,
  bairro: null,
  cidade: null,
  uf: null,
  cep: null,
} as const;

export const contatoSchema = z.object({
  emails: z.array(z.string().email()).default([]),
  /** Telefones em E.164 (`+5521999998888`). */
  telefones: z.array(z.string()).default([]),
  endereco: enderecoSchema,
});

export const filiacaoSchema = z.object({
  mae: textoOpcional,
  pai: textoOpcional,
});

/** Documentos do aluno — espelha as colunas de certidão e identidade. */
export const documentosSchema = z.object({
  identidade: textoOpcional,
  orgaoEmissor: textoOpcional,
  ufEmissor: textoOpcional,
  dataEmissao: dataSchema.nullish(),
  certidaoTermo: textoOpcional,
  certidaoFolha: textoOpcional,
  certidaoLivro: textoOpcional,
  cartorio: textoOpcional,
  ufCartorio: textoOpcional,
  codigoINEP: textoOpcional,
  nacionalidade: textoOpcional,
  naturalidade: textoOpcional,
  ufNaturalidade: textoOpcional,
});

/**
 * Situação da matrícula.
 *
 * O Access guardava só um texto livre, e por isso o sistema sabia dizer que
 * o aluno não estava mais ativo sem saber **por quê** nem **desde quando** —
 * que é exatamente o que a secretaria precisa ao emitir uma declaração ou
 * responder ao Censo.
 *
 * Aquele texto (`statusOriginal`) foi removido depois de conferido: nos 73
 * cadastros ele só dizia "Ativo" ou "Cancelado", a mesma informação de
 * `ativo`. Campo que repete outro é campo que um dia diverge dele.
 */
export const situacaoDaMatriculaSchema = z.enum([
  "ativa",
  "cancelada",
  "concluida",
  "transferida",
  "abandono",
]);

export type SituacaoDaMatricula = z.infer<typeof situacaoDaMatriculaSchema>;

export const ROTULOS_DE_SITUACAO_DA_MATRICULA: Record<
  SituacaoDaMatricula,
  string
> = {
  ativa: "Ativa",
  cancelada: "Cancelada",
  concluida: "Concluída",
  transferida: "Transferida",
  abandono: "Abandono",
};

export const alunoSchema = z.object({
  matricula: z.string().trim().min(1, "Informe a matrícula"),
  nome: z.string().trim().min(3, "Informe o nome completo"),
  /** Nome sem acento e em maiúsculas — o Firestore não tem busca textual. */
  nomeParaBusca: z.string().optional(),
  dataNascimento: dataSchema.nullish(),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF tem 11 dígitos")
    .nullish(),
  /**
   * Inativo é o ex-aluno: sai das listagens, mas o histórico permanece.
   *
   * **Derivado de `situacaoMatricula`** na gravação, nunca editado à mão —
   * ver `ehMatriculaAtiva`. Guardar os dois de forma independente é como um
   * aluno transferido continua aparecendo na chamada.
   */
  ativo: z.boolean().default(true),
  situacaoMatricula: situacaoDaMatriculaSchema.default("ativa"),
  /**
   * Quando a situação passou a valer.
   *
   * Com matrícula **ativa**, é a própria data de matrícula. Nos demais
   * casos é outra data — o dia do cancelamento, da transferência, da
   * conclusão —, e é essa diferença que faz o campo existir.
   */
  dataDaSituacao: dataSchema.nullish(),

  turmaId: z.string().nullish(),
  turmaCodigo: z.string().nullish(),
  segmento: segmentoSchema.nullish(),
  serie: textoOpcional,
  turno: turnoSchema.nullish(),

  contato: contatoSchema,
  filiacao: filiacaoSchema,
  documentos: documentosSchema,

  /**
   * Caminho do arquivo no Cloud Storage (`alunos/{matricula}/foto.webp`).
   *
   * Não é URL: a foto de um menor de idade não tem endereço público. A
   * imagem é servida por `/api/alunos/{matricula}/foto`, que verifica a
   * sessão e o escopo de quem pede.
   */
  fotoPath: z.string().nullish(),
  /** Quando a foto foi trocada — usado para furar o cache do navegador. */
  fotoAtualizadaEm: z.string().nullish(),
  observacoes: textoOpcional,
  dataMatricula: dataSchema.nullish(),

  origem: origemSchema,
  migradoEm: z.string().nullish(),
  ...auditoriaDoDocumentoSchema.shape,
});

export type Aluno = z.infer<typeof alunoSchema>;

/**
 * O que o formulário da secretaria edita.
 *
 * Matrícula fica de fora: é a chave do documento e do histórico escolar
 * inteiro — mudá-la seria criar outro aluno. Campos calculados e de
 * auditoria também ficam de fora, porque quem os preenche é o servidor.
 */
export const alunoEditavelSchema = alunoSchema.omit({
  matricula: true,
  nomeParaBusca: true,
  origem: true,
  migradoEm: true,
  criadoEm: true,
  criadoPor: true,
  atualizadoEm: true,
  atualizadoPor: true,
});

export type AlunoEditavel = z.infer<typeof alunoEditavelSchema>;

/** Criação: aí sim a matrícula é informada, e precisa ser inédita. */
export const alunoNovoSchema = alunoEditavelSchema.extend({
  matricula: z.string().trim().min(1, "Informe a matrícula"),
});

export type AlunoNovo = z.infer<typeof alunoNovoSchema>;

/** Matrícula do aluno em uma turma, por ano letivo. */
export const matriculaSchema = z.object({
  matricula: z.string(),
  nome: z.string(),
  anoLetivo: z.number().int(),
  turmaId: z.string(),
  turmaCodigo: z.string(),
  segmento: segmentoSchema,
  serie: z.string(),
  turno: turnoSchema,
  situacao: z.enum(["ativa", "cancelada", "transferida", "concluida"]),
  origem: origemSchema,
});

export type Matricula = z.infer<typeof matriculaSchema>;
