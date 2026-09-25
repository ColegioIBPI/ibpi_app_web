import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  textoOpcional,
} from "@/core/modelo/comum";
import { destinoSchema, type Destino } from "@/core/modelo/aviso";

/**
 * Informações úteis — os cards com link da aba do app.
 *
 * Horário das aulas, calendário escolar, critérios de avaliação, proposta
 * pedagógica, dependências, eletivas, tutoria.
 *
 * O **alcance é o mesmo dos avisos** (`destino` + `chave`), e de propósito:
 * o colégio pensa em "para quem isto vale" de um jeito só — toda a
 * comunidade, um segmento, uma turma, um aluno. Um segundo modelo de
 * alcance significaria uma segunda Security Rule, e duas regras que dizem a
 * mesma coisa é como uma delas fica para trás.
 *
 * A diferença para o aviso é o tempo: aviso é do dia, informação fica.
 */

/**
 * Tipo do card, para o app escolher o ícone e agrupar.
 *
 * `escopoUsual` é o alcance que o colégio usa para cada um. Ele **sugere** o
 * destino no formulário, sem travar: quem publica pode ter um motivo que o
 * modelo não conhece.
 */
export const tipoDeInformacaoSchema = z.enum([
  "horario-de-aulas",
  "calendario-de-avaliacao",
  "calendario-escolar",
  "criterios-de-avaliacao",
  "proposta-pedagogica",
  "dependencias",
  "eletivas",
  "tutoria",
  "outros",
]);

export type TipoDeInformacao = z.infer<typeof tipoDeInformacaoSchema>;

export const ROTULOS_DE_INFORMACAO: Record<TipoDeInformacao, string> = {
  "horario-de-aulas": "Horário das aulas",
  "calendario-de-avaliacao": "Calendário de avaliação",
  "calendario-escolar": "Calendário escolar",
  "criterios-de-avaliacao": "Critérios de avaliação",
  "proposta-pedagogica": "Proposta Pedagógica",
  dependencias: "Informações sobre Dependências",
  eletivas: "Informações sobre Eletivas",
  tutoria: "Informações sobre Tutoria",
  outros: "Outros",
};

/** Alcance que o colégio usa para cada tipo. Sugestão, não regra. */
export const ESCOPO_USUAL: Record<TipoDeInformacao, Destino["tipo"]> = {
  "horario-de-aulas": "turma",
  "calendario-de-avaliacao": "segmento",
  "calendario-escolar": "todos",
  "criterios-de-avaliacao": "segmento",
  "proposta-pedagogica": "todos",
  dependencias: "segmento",
  eletivas: "segmento",
  tutoria: "aluno",
  outros: "todos",
};

export const informacaoSchema = z.object({
  tipo: tipoDeInformacaoSchema,
  titulo: z.string().trim().min(3, "Informe um título"),
  descricao: textoOpcional,

  /**
   * Endereço do material.
   *
   * Só `http` e `https`: o card abre num navegador, e um `javascript:` aqui
   * viraria execução de código na mão de quem publica.
   */
  url: z
    .string()
    .trim()
    .url("Informe um endereço começando com https://")
    .refine(
      (valor) => valor.startsWith("https://") || valor.startsWith("http://"),
      "O endereço precisa começar com https://",
    ),

  destino: destinoSchema,
  /** Derivada do destino; a mesma `chaveDoDestino` dos avisos. */
  chave: z.string().min(1),

  /** Ordem do card na tela. Valores de 10 em 10, como as disciplinas. */
  ordem: z.number().int().default(0),

  /** Despublicar em vez de apagar: o material some da família e fica no histórico. */
  ativo: z.boolean().default(true),

  publicadoPorUid: z.string().min(1),
  publicadoPorNome: z.string().optional(),
  publicadoEm: z.string(),

  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Informacao = z.infer<typeof informacaoSchema>;
