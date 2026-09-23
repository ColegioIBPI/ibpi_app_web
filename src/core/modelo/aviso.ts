import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  segmentoSchema,
  textoOpcional,
} from "@/core/modelo/comum";

/**
 * Avisos direcionados.
 *
 * Mesma segmentação que o app MyIBPI já prevê na aba Avisos: aluno
 * individual, responsável individual, turma, segmento ou toda a comunidade.
 * Modelar igual é o que permite o aviso publicado aqui aparecer no app
 * quando ele chegar, sem retrabalho.
 */

/**
 * Para quem o aviso é.
 *
 * `turma` alcança os alunos daquela turma **e** os responsáveis deles — é
 * assim que o colégio pensa "avisar a turma", e separar os dois criaria o
 * trabalho de publicar duas vezes.
 */
export const destinoSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("todos") }),
  z.object({ tipo: z.literal("segmento"), segmento: segmentoSchema }),
  z.object({
    tipo: z.literal("turma"),
    turmaId: z.string().min(1),
    turmaCodigo: z.string().min(1),
  }),
  z.object({
    tipo: z.literal("aluno"),
    matricula: z.string().min(1),
    nome: z.string().min(1),
  }),
  z.object({
    tipo: z.literal("responsavel"),
    responsavelId: z.string().min(1),
    nome: z.string().min(1),
  }),
]);

export type Destino = z.infer<typeof destinoSchema>;

export const ROTULOS_DE_DESTINO: Record<Destino["tipo"], string> = {
  todos: "Toda a comunidade",
  segmento: "Segmento",
  turma: "Turma",
  aluno: "Aluno",
  responsavel: "Responsável",
};

/**
 * Chave do destino, gravada no documento.
 *
 * É ela que torna a consulta possível: em vez de varrer todos os avisos e
 * filtrar em memória, a tela busca `where("chave", "in", [...])` com as
 * chaves da própria pessoa. O Firestore não faz OR entre campos diferentes,
 * e uma chave única resolve isso sem índice composto.
 */
export function chaveDoDestino(destino: Destino): string {
  switch (destino.tipo) {
    case "todos":
      return "todos";
    case "segmento":
      return `segmento:${destino.segmento}`;
    case "turma":
      return `turma:${destino.turmaId}`;
    case "aluno":
      return `aluno:${destino.matricula}`;
    case "responsavel":
      return `responsavel:${destino.responsavelId}`;
  }
}

/** Como o destino aparece na tela. */
export function descreverDestino(destino: Destino): string {
  switch (destino.tipo) {
    case "todos":
      return "Toda a comunidade escolar";
    case "segmento":
      return `Segmento: ${destino.segmento}`;
    case "turma":
      return `Turma ${destino.turmaCodigo}`;
    case "aluno":
      return `Aluno: ${destino.nome}`;
    case "responsavel":
      return `Responsável: ${destino.nome}`;
  }
}

export const anexoSchema = z.object({
  /** Caminho no Storage. Como a foto do aluno, não é URL pública. */
  path: z.string().min(1),
  nome: z.string().min(1),
  tipo: z.string().min(1),
  tamanho: z.number().int().positive(),
});

export type Anexo = z.infer<typeof anexoSchema>;

export const avisoSchema = z.object({
  titulo: z.string().trim().min(3, "Informe um título"),
  corpo: z.string().trim().min(1, "Escreva o aviso"),
  destino: destinoSchema,
  /** Derivada do destino; ver `chaveDoDestino`. */
  chave: z.string().min(1),
  anexos: z.array(anexoSchema).default([]),

  publicadoPorUid: z.string().min(1),
  publicadoPorNome: z.string().optional(),
  publicadoPorPerfil: z.string().optional(),
  publicadoEm: z.string(),

  /** Despublicar em vez de apagar: o que foi comunicado fica registrado. */
  ativo: z.boolean().default(true),

  /**
   * Ainda não há envio de push — o canal é do app, que virá depois. O campo
   * existe para o app saber o que já foi notificado e não repetir aviso
   * antigo quando entrar no ar.
   */
  notificadoEm: z.string().nullish(),

  observacoes: textoOpcional,
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Aviso = z.infer<typeof avisoSchema>;
