import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  dataSchema,
  origemSchema,
  textoOpcional,
  trimestreSchema,
} from "@/core/modelo/comum";

/**
 * Frequência e ocorrências.
 *
 * Nada disso está no Access — vive em planilha e em PDF impresso. Os campos
 * abaixo espelham exatamente o que o colégio já preenche hoje:
 *
 * - `CONTROLE DE FALTAS.xlsx`, aba BASE: DATA · TURMA · NOME · F/P/A · AULA ·
 *   OCORRÊNCIA · OBSERVAÇÃO. É o registro diário da secretaria.
 * - `PAUTA DE CONTEÚDO` / `diciplina.pdf`: o diário de classe do professor,
 *   com uma coluna por aula, o conteúdo ministrado e o percentual de
 *   frequência por aluno.
 */

/** Como a secretaria marca hoje: F (falta), P (presente), A (atraso). */
export const situacaoDePresencaSchema = z.enum(["presente", "falta", "atraso"]);

export type SituacaoDePresenca = z.infer<typeof situacaoDePresencaSchema>;

export const ROTULOS_DE_PRESENCA: Record<SituacaoDePresenca, string> = {
  presente: "Presente",
  falta: "Falta",
  atraso: "Atraso",
};

/** Códigos usados na planilha, mantidos para a digitação rápida. */
export const CODIGOS_DE_PRESENCA: Record<string, SituacaoDePresenca> = {
  P: "presente",
  F: "falta",
  A: "atraso",
};

/**
 * Tipos de ocorrência em uso, retirados da própria planilha
 * (aba RD, lista "Tipos de ocorrência").
 */
export const tipoDeOcorrenciaSchema = z.enum([
  "uniforme",
  "comportamento-inadequado",
  "saida-antecipada",
  "porte-indevido-de-celular",
  "entrada-atrasada",
  "atestado-medico",
  "falta-justificada",
  "academica",
  "outros",
]);

export type TipoDeOcorrencia = z.infer<typeof tipoDeOcorrenciaSchema>;

export const ROTULOS_DE_OCORRENCIA: Record<TipoDeOcorrencia, string> = {
  uniforme: "Uniforme",
  "comportamento-inadequado": "Comportamento inadequado",
  "saida-antecipada": "Saída antecipada",
  "porte-indevido-de-celular": "Porte indevido de celular",
  "entrada-atrasada": "Entrada atrasada",
  "atestado-medico": "Atestado médico",
  "falta-justificada": "Falta justificada",
  academica: "Ocorrência acadêmica",
  outros: "Outros",
};

/** Registro diário da secretaria — uma linha por aluno por dia. */
export const frequenciaDiariaSchema = z.object({
  data: dataSchema,
  matricula: z.string().min(1),
  nome: z.string().optional(),
  turmaId: z.string().min(1),
  turmaCodigo: z.string().optional(),
  situacao: situacaoDePresencaSchema,
  /** Número da aula, quando a marcação é de uma aula específica. */
  aula: z.number().int().positive().nullish(),
  ocorrencia: tipoDeOcorrenciaSchema.nullish(),
  observacao: textoOpcional,
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type FrequenciaDiaria = z.infer<typeof frequenciaDiariaSchema>;

/**
 * Uma aula do diário de classe: data, conteúdo ministrado e presenças.
 *
 * Dia sem aula (férias, recesso, ponte, feriado) é marcado aqui e **não
 * entra no cálculo de frequência** — na pauta impressa aparece escrito
 * "férias", "recesso", "ponte" no lugar do p/f.
 */
export const aulaSchema = z.object({
  numero: z.number().int().positive(),
  data: dataSchema,
  conteudo: textoOpcional,
  semAula: z.enum(["ferias", "recesso", "ponte", "feriado"]).nullish(),
  /** matrícula → presente? */
  presencas: z.record(z.string(), z.boolean()).default({}),
});

export type Aula = z.infer<typeof aulaSchema>;

/** Avaliação de trabalho (PL), a grade paralela da pauta. */
export const avaliacaoDeTrabalhoSchema = z.object({
  numero: z.number().int().positive(),
  data: dataSchema,
  descricao: textoOpcional,
  /** matrícula → nota */
  notas: z.record(z.string(), z.number()).default({}),
});

export type AvaliacaoDeTrabalho = z.infer<typeof avaliacaoDeTrabalhoSchema>;

/** Diário de classe do professor, por alocação e trimestre. */
export const diarioDeClasseSchema = z.object({
  anoLetivo: z.number().int(),
  trimestre: trimestreSchema,
  alocacaoId: z.string().min(1),
  professorId: z.string().min(1),
  professorNome: z.string().optional(),
  turmaId: z.string().min(1),
  turmaCodigo: z.string().optional(),
  disciplinaId: z.string().min(1),
  disciplinaNome: z.string().optional(),
  aulas: z.array(aulaSchema).default([]),
  avaliacoesDeTrabalho: z.array(avaliacaoDeTrabalhoSchema).default([]),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type DiarioDeClasse = z.infer<typeof diarioDeClasseSchema>;

/**
 * Ocorrência disciplinar ou acadêmica.
 *
 * Não confundir com a tabela `Fatos` do Access, que apesar do nome guarda
 * itens financeiros contratados.
 */
export const ocorrenciaSchema = z.object({
  data: dataSchema,
  matricula: z.string().min(1),
  nome: z.string().optional(),
  turmaId: z.string().min(1),
  turmaCodigo: z.string().optional(),
  tipo: tipoDeOcorrenciaSchema,
  descricao: z.string().trim().min(1, "Descreva a ocorrência"),
  /** `uid` de quem lançou — a família contesta, o colégio precisa saber. */
  registradoPor: z.string().nullish(),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Ocorrencia = z.infer<typeof ocorrenciaSchema>;
