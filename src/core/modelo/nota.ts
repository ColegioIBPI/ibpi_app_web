import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  textoOpcional,
  trimestreSchema,
} from "@/core/modelo/comum";

/**
 * Notas e boletim.
 *
 * Os campos espelham o `MODELO DE BOLETIM.xlsx` que o colégio usa hoje, com
 * os quatro blocos que ele tem: disciplinas regulares, Projeto Bilíngue
 * (IBEU), eletivas e dependência/reclassificação.
 *
 * **Nenhuma nota foi migrada.** O Access está organizado em bimestres e o
 * boletim atual é trimestral; a regra de conversão depende da coordenação
 * (ver `docs/migracao.md`). O modelo existe para a tela de lançamento não
 * precisar ser redesenhada quando a definição chegar.
 *
 * A regra de cálculo está no README, seção 5.6:
 *   média do trimestre = (Projeto + Tarefas + AV) ÷ 3
 *   média anual        = média dos três trimestres
 *   aprovado           = média ≥ 5,0 e frequência ≥ 75%
 *   média final        = (média anual + recuperação) ÷ 2
 */

/** Nota de 0 a 10, com decimais. */
export const valorDeNotaSchema = z
  .number()
  .min(0, "A nota não pode ser negativa")
  .max(10, "A nota máxima é 10")
  .nullable();

/** As três avaliações do trimestre, como no boletim. */
export const avaliacoesDoTrimestreSchema = z.object({
  projeto: valorDeNotaSchema.default(null),
  tarefas: valorDeNotaSchema.default(null),
  av: valorDeNotaSchema.default(null),
});

export type AvaliacoesDoTrimestre = z.infer<typeof avaliacoesDoTrimestreSchema>;

/** Lançamento de um aluno numa disciplina, num trimestre. */
export const notaSchema = z.object({
  anoLetivo: z.number().int(),
  trimestre: trimestreSchema,
  matricula: z.string().min(1),
  nome: z.string().optional(),
  turmaId: z.string().min(1),
  turmaCodigo: z.string().optional(),
  disciplinaId: z.string().min(1),
  disciplinaNome: z.string().optional(),
  avaliacoes: avaliacoesDoTrimestreSchema,
  /** Faltas do aluno na disciplina, no trimestre. */
  faltas: z.number().int().min(0).default(0),
  observacoes: textoOpcional,
  lancadoPor: z.string().nullish(),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Nota = z.infer<typeof notaSchema>;

export const situacaoFinalSchema = z.enum([
  "cursando",
  "aprovado",
  "recuperacao",
  "reprovado",
  "reprovado-por-falta",
]);

export type SituacaoFinal = z.infer<typeof situacaoFinalSchema>;

export const ROTULOS_DE_SITUACAO: Record<SituacaoFinal, string> = {
  cursando: "Cursando",
  aprovado: "Aprovado",
  recuperacao: "Em recuperação",
  reprovado: "Reprovado",
  "reprovado-por-falta": "Reprovado por falta",
};

/** Linha do boletim: uma disciplina, os três trimestres e o fechamento. */
export const linhaDoBoletimSchema = z.object({
  disciplinaId: z.string(),
  disciplinaNome: z.string(),
  trimestres: z.record(z.string(), avaliacoesDoTrimestreSchema).default({}),
  mediasPorTrimestre: z.record(z.string(), z.number().nullable()).default({}),
  mediaAnual: z.number().nullable().default(null),
  recuperacao: valorDeNotaSchema.default(null),
  mediaFinal: z.number().nullable().default(null),
  faltas: z.number().int().min(0).default(0),
  situacao: situacaoFinalSchema.default("cursando"),
});

export type LinhaDoBoletim = z.infer<typeof linhaDoBoletimSchema>;

/**
 * Projeto Bilíngue (IBEU) — trilha paralela do boletim, com nível (ex.: N2)
 * e as três frentes que aparecem na planilha.
 */
export const projetoBilingueSchema = z.object({
  nivel: textoOpcional,
  componentes: z
    .array(
      z.object({
        nome: z.enum(["STEAM", "ENGLISH", "PROJECT"]),
        trimestres: z.record(z.string(), valorDeNotaSchema).default({}),
        recuperacao: valorDeNotaSchema.default(null),
      }),
    )
    .default([]),
});

export type ProjetoBilingue = z.infer<typeof projetoBilingueSchema>;

/** Eletiva cursada, com o período e a situação (`CURSANDO` na planilha). */
export const eletivaSchema = z.object({
  nome: z.string(),
  periodo: textoOpcional,
  situacao: z.enum(["cursando", "concluida", "cancelada"]).default("cursando"),
});

export type Eletiva = z.infer<typeof eletivaSchema>;

/**
 * Dependência e reclassificação, que no boletim usam um cálculo próprio:
 * `P1`, `P2`, `TOTAL`, `REC`, `MÉDIA`, `SITUAÇÃO`.
 */
export const dependenciaSchema = z.object({
  disciplinaId: z.string(),
  disciplinaNome: z.string(),
  tipo: z.enum(["dependencia", "reclassificacao"]),
  anoDeOrigem: z.number().int().nullish(),
  p1: valorDeNotaSchema.default(null),
  p2: valorDeNotaSchema.default(null),
  total: z.number().nullable().default(null),
  recuperacao: valorDeNotaSchema.default(null),
  media: z.number().nullable().default(null),
  situacao: situacaoFinalSchema.default("cursando"),
});

export type Dependencia = z.infer<typeof dependenciaSchema>;

/** Boletim consolidado do aluno no ano letivo. */
export const boletimSchema = z.object({
  anoLetivo: z.number().int(),
  matricula: z.string().min(1),
  nome: z.string().optional(),
  turmaId: z.string().min(1),
  turmaCodigo: z.string().optional(),
  segmentoRotulo: z.string().optional(),
  disciplinas: z.array(linhaDoBoletimSchema).default([]),
  projetoBilingue: projetoBilingueSchema.nullish(),
  eletivas: z.array(eletivaSchema).default([]),
  dependencias: z.array(dependenciaSchema).default([]),
  faltasPorTrimestre: z.record(z.string(), z.number().int()).default({}),
  percentualDeFrequencia: z.number().min(0).max(1).nullable().default(null),
  situacao: situacaoFinalSchema.default("cursando"),
  observacoes: textoOpcional,
  fechadoEm: z.string().nullish(),
  fechadoPor: z.string().nullish(),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Boletim = z.infer<typeof boletimSchema>;
