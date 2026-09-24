import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  segmentoSchema,
  textoOpcional,
  turnoSchema,
} from "@/core/modelo/comum";

/**
 * Estrutura da escola: turma, disciplina, sala, professor e alocação.
 *
 * Turma, disciplina e sala vieram do Access. **Professor e alocação não** —
 * a tabela `Professores` do sistema antigo está vazia, e o vínculo
 * professor × turma × disciplina nunca existiu lá; ele só aparece no
 * cabeçalho do diário de classe impresso ("PROFESSOR: JUAREZ / DISCIPLINA:
 * FÍSICA / TURMA: EM1A").
 *
 * Os campos estão modelados mesmo sem dado a migrar, espelhando as colunas
 * de origem, para que o cadastro no sistema novo não precise ser redesenhado
 * depois.
 */

/**
 * Id do documento da turma: ela sempre pertence a um ano letivo, então o
 * ano faz parte da chave (`2026-EM1A`). A pontuação sai porque id de
 * documento não pode conter barra.
 */
export function idDaTurma(anoLetivo: number, codigo: string): string {
  return `${anoLetivo}-${codigo.replace(/[^A-Za-z0-9]/g, "")}`;
}

export const turmaSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código da turma"),
  anoLetivo: z.number().int(),
  segmento: segmentoSchema,
  segmentoRotulo: z.string().optional(),
  turno: turnoSchema,
  turnoRotulo: z.string().optional(),
  salaId: z.string().nullish(),
  ativa: z.boolean().default(true),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Turma = z.infer<typeof turmaSchema>;

export const disciplinaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da disciplina"),
  sigla: textoOpcional,
  /**
   * As grafias que existiam no Access antes da consolidação
   * (`PORTUGUES/LITERATURA` × `PORTUGUÊS/LITERATURA`). Preservadas para
   * rastrear de onde o registro veio.
   */
  grafiasOriginais: z.array(z.string()).default([]),
  /**
   * Posição da disciplina no boletim.
   *
   * O boletim do colégio segue uma **ordem pedagógica** — Português,
   * Oficina de Textos, Geografia, História… —, não a alfabética. A ordem é
   * do colégio, então mora aqui, como dado, e não numa lista fixa no
   * código. Disciplina sem ordem vai para o fim, em ordem de nome.
   *
   * Os valores são espaçados de 10 em 10 para caber uma disciplina nova
   * entre duas existentes sem renumerar todas.
   */
  ordem: z.number().int().nullish(),
  ativa: z.boolean().default(true),
  origem: origemSchema,
});

export type Disciplina = z.infer<typeof disciplinaSchema>;

export const salaSchema = z.object({
  nome: z.string().trim().min(1),
  sigla: textoOpcional,
  capacidade: z.number().int().positive().nullish(),
  origem: origemSchema,
});

export type Sala = z.infer<typeof salaSchema>;

/**
 * Professor. Campos espelham a tabela `Professores` do Access
 * (`CodigoInstrutor`, `NomeInstrutor`, `Endereco`, `HorárioInstrutor`,
 * `Identidade`, `cpf`, `tel1..3`, `Obs`), que está vazia.
 */
export const professorSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  nomeParaBusca: z.string().optional(),
  codigoInterno: textoOpcional,
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF tem 11 dígitos")
    .nullish(),
  identidade: textoOpcional,
  email: z.string().email("E-mail inválido").nullish(),
  telefones: z.array(z.string()).default([]),
  endereco: textoOpcional,
  horario: textoOpcional,
  observacoes: textoOpcional,
  /** `uid` da conta de acesso, quando a secretaria já a criou. */
  uid: z.string().nullish(),
  /**
   * Turmas que leciona, desnormalizadas aqui porque são lidas pelas
   * Security Rules a cada consulta do professor (ver `firestore.rules`).
   */
  turmas: z.array(z.string()).default([]),
  ativo: z.boolean().default(true),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Professor = z.infer<typeof professorSchema>;

/**
 * Alocação: professor × turma × disciplina × ano letivo.
 *
 * É o registro que define o **escopo de acesso do professor** — ele só
 * enxerga alunos das turmas em que está alocado.
 */
export const alocacaoSchema = z.object({
  anoLetivo: z.number().int(),
  professorId: z.string().min(1),
  professorNome: z.string().optional(),
  turmaId: z.string().min(1),
  turmaCodigo: z.string().optional(),
  disciplinaId: z.string().min(1),
  disciplinaNome: z.string().optional(),
  ativa: z.boolean().default(true),
  origem: origemSchema,
});

export type Alocacao = z.infer<typeof alocacaoSchema>;

/**
 * Dias e horários de aula da turma. Espelha `Dias de Aulas` do Access
 * (`codigo Turma`, `dia de aula`, `HoraInicio`, `HoraFim`), também vazia.
 */
export const diaDeAulaSchema = z.object({
  turmaId: z.string().min(1),
  /** 0 = domingo, como `Date.getDay()`. */
  diaDaSemana: z.number().int().min(0).max(6),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  disciplinaId: z.string().nullish(),
  salaId: z.string().nullish(),
});

export type DiaDeAula = z.infer<typeof diaDeAulaSchema>;
