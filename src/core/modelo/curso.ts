import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  textoOpcional,
} from "@/core/modelo/comum";

/**
 * Os cursos do colégio: Ensino Fundamental, Médio, EJA — e o que a
 * secretaria criar.
 *
 * Era uma lista fixa no código. Virou cadastro porque a lista é do colégio,
 * não do sistema: abrir um curso livre ou um técnico não pode depender de
 * alguém mexer no código e publicar.
 *
 * **O id do documento é o código**, e os quatro primeiros usam exatamente
 * os códigos que já existiam (`medio`, `fundamental`, `eja-medio`,
 * `eja-fundamental`). Por isso o cadastro nasce sem migração: todo aluno,
 * turma, boletim e aviso já gravado aponta para um curso válido.
 *
 * O campo nos documentos continua se chamando `segmento` — ver
 * `core/modelo/comum.ts`.
 */
export const cursoSchema = z.object({
  /** O mesmo valor do id do documento, repetido para leitura direta. */
  codigo: z.string().trim().min(1),
  nome: z.string().trim().min(2, "Informe o nome do curso"),
  sigla: textoOpcional,
  /**
   * Ordem nas listas e nos seletores. Espaçada de 10 em 10 para caber um
   * curso novo entre dois existentes sem renumerar todos — mesma convenção
   * das disciplinas.
   */
  ordem: z.number().int().nullish(),
  /**
   * Curso encerrado some dos seletores e **continua existindo**: aluno
   * formado, boletim e recibo antigos apontam para ele, e apagá-lo deixaria
   * o histórico sem nome de curso.
   */
  ativo: z.boolean().default(true),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Curso = z.infer<typeof cursoSchema>;

export type CursoComId = Curso & { id: string };

/** A semente do cadastro: o que o sistema já usava antes da tela existir. */
export const CURSOS_PADRAO: Array<Pick<Curso, "codigo" | "nome" | "ordem">> = [
  { codigo: "fundamental", nome: "Ensino Fundamental", ordem: 10 },
  { codigo: "medio", nome: "Ensino Médio", ordem: 20 },
  { codigo: "eja-fundamental", nome: "EJA — Fundamental", ordem: 30 },
  { codigo: "eja-medio", nome: "EJA — Médio", ordem: 40 },
];
