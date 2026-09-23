"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { obterAlocacao } from "@/core/escola/alocacoes.server";
import { getAdminDb } from "@/core/firebase/admin";
import {
  avaliacoesDoTrimestreSchema,
  COLECOES,
  notaSchema,
  trimestreSchema,
  type Nota,
} from "@/core/modelo";
import { idDaNota } from "@/features/notas/domain/lancamento";

/**
 * Lançamento de notas.
 *
 * O professor lança nas disciplinas em que está alocado; secretaria e
 * coordenação corrigem qualquer uma. A verificação de escopo é feita aqui,
 * porque o Admin SDK ignora as Security Rules.
 *
 * Toda gravação passa por `gravarComAuditoria`: nota é um dos três dados
 * que o colégio precisa saber quem mudou e quando (README, seção 6.3).
 */

export interface ResultadoDoLancamento {
  ok: boolean;
  erro?: string;
  /** Quantos alunos tiveram nota gravada. */
  gravados?: number;
}

const linhaSchema = z.object({
  matricula: z.string().min(1),
  avaliacoes: avaliacoesDoTrimestreSchema,
  faltas: z.number().int().min(0),
});

const lancamentoSchema = z.object({
  alocacaoId: z.string().min(1),
  trimestre: trimestreSchema,
  linhas: z.array(linhaSchema),
});

export type EntradaDeLancamento = z.infer<typeof lancamentoSchema>;

export async function lancarNotas(
  dados: EntradaDeLancamento,
): Promise<ResultadoDoLancamento> {
  const entrada = lancamentoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("notas", "lancar");
  const alocacao = await obterAlocacao(sessao, entrada.data.alocacaoId);

  // Mesma resposta para alocação inexistente e para a de outro professor:
  // dizer "existe, mas não é sua" já entregaria que a turma tem a
  // disciplina.
  if (!alocacao) return { ok: false, erro: "Alocação não encontrada." };

  if (entrada.data.linhas.length === 0) {
    return { ok: true, gravados: 0 };
  }

  const db = getAdminDb();
  const { trimestre } = entrada.data;

  let gravados = 0;

  for (const linha of entrada.data.linhas) {
    const id = idDaNota(
      alocacao.anoLetivo,
      trimestre,
      linha.matricula,
      alocacao.disciplinaId,
    );

    const referencia = db.collection(COLECOES.notas).doc(id);
    const anterior = await referencia.get();

    const nota = notaSchema.safeParse({
      anoLetivo: alocacao.anoLetivo,
      trimestre,
      matricula: linha.matricula,
      turmaId: alocacao.turmaId,
      turmaCodigo: alocacao.turmaCodigo,
      disciplinaId: alocacao.disciplinaId,
      disciplinaNome: alocacao.disciplinaNome,
      avaliacoes: linha.avaliacoes,
      faltas: linha.faltas,
      lancadoPor: sessao.uid,
      origem: "portal",
    });

    if (!nota.success) {
      return {
        ok: false,
        erro: `${linha.matricula}: ${nota.error.issues[0]?.message}`,
      };
    }

    const alteracoes = await gravarComAuditoria({
      colecao: COLECOES.notas,
      documentoId: id,
      antes: anterior.exists ? (anterior.data() as Nota) : null,
      depois: nota.data,
      autor: sessao,
    });

    if (Object.keys(alteracoes).length > 0) gravados += 1;
  }

  revalidatePath("/gestao/notas");
  revalidatePath(`/gestao/notas/${entrada.data.alocacaoId}`);
  revalidatePath("/portal/boletim");

  return { ok: true, gravados };
}
