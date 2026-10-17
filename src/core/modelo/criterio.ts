import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  textoOpcional,
} from "@/core/modelo/comum";

/**
 * O critério de avaliação do ano letivo, **como documento publicado**.
 *
 * Isto é o que o colégio divulga a professores e famílias: quantos
 * períodos, o que compõe a média, a média mínima e a frequência exigida.
 *
 * **Não é o que o boletim calcula.** A conta que aprova ou reprova um aluno
 * continua em `features/notas/domain/calculo.ts`, em funções puras com
 * teste para cada caso — ver `docs/avaliacao.md`. Ligar o cálculo a um
 * documento editável faria o boletim de um aluno mudar de resultado porque
 * alguém salvou uma tela, e boletim já fechado não pode mudar de ideia.
 *
 * O que este cadastro resolve é outro problema, real: hoje o critério só
 * existe em papel e na cabeça da coordenação, e cada família pergunta por
 * telefone.
 *
 * Um documento por ano letivo, com o ano como id: o critério de 2026 não
 * substitui o de 2025, que continua valendo para o boletim daquele ano.
 */

export const avaliacaoDoCriterioSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da avaliação"),
  /**
   * Peso **descritivo**: o texto que explica quanto ela vale ("1/3 da
   * média", "40%"). Texto, e não número, porque isto não entra em conta
   * nenhuma — e um número aqui daria a impressão contrária.
   */
  peso: textoOpcional,
  descricao: textoOpcional,
});

export type AvaliacaoDoCriterio = z.infer<typeof avaliacaoDoCriterioSchema>;

export const criterioDeAvaliacaoSchema = z.object({
  anoLetivo: z.number().int(),
  /** `null` quando vale para o colégio inteiro. */
  cursoCodigo: z.string().trim().nullable().default(null),
  periodos: z
    .number()
    .int()
    .positive("O ano precisa de pelo menos um período"),
  /** Como o colégio chama o período: trimestre, bimestre, módulo. */
  nomeDoPeriodo: z.string().trim().min(1).default("Trimestre"),
  avaliacoes: z.array(avaliacaoDoCriterioSchema).default([]),
  mediaMinima: z.number().min(0).max(10),
  frequenciaMinima: z.number().min(0).max(100),
  comoSeCalcula: textoOpcional,
  recuperacao: textoOpcional,
  observacoes: textoOpcional,
  /**
   * Enquanto não publicado, só a equipe lê — o critério costuma ser
   * discutido antes de virar comunicado.
   */
  publicado: z.boolean().default(false),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type CriterioDeAvaliacao = z.infer<typeof criterioDeAvaliacaoSchema>;

export type CriterioComId = CriterioDeAvaliacao & { id: string };

/**
 * O que o sistema calcula hoje, para a tela nascer preenchida.
 *
 * Vem de `docs/avaliacao.md`, confirmado com a direção. Preencher o
 * formulário com isto evita que o critério publicado contradiga a conta por
 * distração de quem digitou.
 */
export const CRITERIO_PADRAO = {
  periodos: 3,
  nomeDoPeriodo: "Trimestre",
  avaliacoes: [
    { nome: "Projeto", peso: "1/3 da média do período", descricao: null },
    { nome: "Tarefas", peso: "1/3 da média do período", descricao: null },
    { nome: "AV", peso: "1/3 da média do período", descricao: null },
  ],
  mediaMinima: 5,
  frequenciaMinima: 75,
  comoSeCalcula:
    "Média do período = (Projeto + Tarefas + AV) ÷ 3\n" +
    "Média anual = (1º + 2º + 3º) ÷ 3\n" +
    "Média final = (média anual + recuperação) ÷ 2",
  recuperacao: "Apenas recuperação final, no fim do ano.",
} as const;
