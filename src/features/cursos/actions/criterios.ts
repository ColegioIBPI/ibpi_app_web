"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  avaliacaoDoCriterioSchema,
  criterioDeAvaliacaoSchema,
  type CriterioDeAvaliacao,
} from "@/core/modelo";
import { idDoCriterio } from "@/features/cursos/services/criterios.server";

/**
 * Cadastro do critério de avaliação do ano.
 *
 * É **documento publicado**, não parâmetro de cálculo: o boletim continua
 * sendo calculado por `features/notas/domain/calculo.ts`. Ver
 * `core/modelo/criterio.ts`.
 */

export interface ResultadoDoCriterio {
  ok: boolean;
  erro?: string;
  id?: string;
}

const formularioSchema = z.object({
  anoLetivo: z.number().int().positive(),
  cursoCodigo: z.string().trim().nullable().default(null),
  periodos: z.number().int().positive("O ano precisa de pelo menos um período"),
  nomeDoPeriodo: z.string().trim().min(1, "Informe o nome do período"),
  avaliacoes: z.array(avaliacaoDoCriterioSchema).default([]),
  mediaMinima: z.number().min(0).max(10),
  frequenciaMinima: z.number().min(0).max(100),
  comoSeCalcula: z.string().trim().nullable().default(null),
  recuperacao: z.string().trim().nullable().default(null),
  observacoes: z.string().trim().nullable().default(null),
  publicado: z.boolean().default(false),
});

export type FormularioDeCriterio = z.infer<typeof formularioSchema>;

export async function salvarCriterio(
  dados: FormularioDeCriterio,
): Promise<ResultadoDoCriterio> {
  const entrada = formularioSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const db = getAdminDb();

  const id = idDoCriterio(entrada.data.anoLetivo, entrada.data.cursoCodigo);
  const referencia = db.collection(COLECOES.criteriosDeAvaliacao).doc(id);
  const atual = await referencia.get();

  const criterio = criterioDeAvaliacaoSchema.safeParse({
    ...entrada.data,
    origem: "portal",
  });

  if (!criterio.success) {
    return { ok: false, erro: criterio.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.criteriosDeAvaliacao,
    documentoId: id,
    antes: atual.exists ? (atual.data() as CriterioDeAvaliacao) : null,
    depois: criterio.data,
    autor: sessao,
  });

  revalidatePath("/gestao/configuracoes/avaliacao");
  revalidatePath("/portal/informacoes");

  return { ok: true, id };
}
