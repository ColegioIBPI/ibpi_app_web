"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  boletimSchema,
  COLECOES,
  ROTULOS_DE_SEGMENTO,
  dependenciaSchema,
  eletivaSchema,
  projetoBilingueSchema,
  valorDeNotaSchema,
  type Boletim,
} from "@/core/modelo";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";
import { idDoBoletim } from "@/features/notas/services/notas.server";

/**
 * Os blocos do boletim que não vêm das notas.
 *
 * Recuperação final, eletivas, dependência/reclassificação, Projeto Bilíngue
 * e observações são lançados pela secretaria e pela coordenação — no
 * boletim impresso são preenchidos à mão, fora da grade de notas.
 *
 * As linhas das disciplinas **não** são gravadas aqui: elas são recalculadas
 * das notas a cada leitura, para que uma correção apareça no boletim na
 * hora.
 */

export interface ResultadoDoBoletim {
  ok: boolean;
  erro?: string;
}

const entradaSchema = z.object({
  matricula: z.string().min(1),
  anoLetivo: z.number().int(),
  recuperacoes: z.record(z.string(), valorDeNotaSchema).default({}),
  eletivas: z.array(eletivaSchema).default([]),
  dependencias: z.array(dependenciaSchema).default([]),
  projetoBilingue: projetoBilingueSchema.nullable().default(null),
  observacoes: z.string().trim().nullable().default(null),
});

export type EntradaDoBoletim = z.infer<typeof entradaSchema>;

export async function salvarBlocosDoBoletim(
  dados: EntradaDoBoletim,
): Promise<ResultadoDoBoletim> {
  const entrada = entradaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  // `gerenciar` e não `lancar`: o professor lança nota, mas dependência,
  // eletiva e observação do boletim são da secretaria e da coordenação.
  const sessao = await exigirPermissao("notas", "gerenciar");

  const aluno = await obterAlunoVisivel(sessao, entrada.data.matricula);
  if (!aluno) return { ok: false, erro: "Aluno não encontrado." };

  const db = getAdminDb();
  const id = idDoBoletim(entrada.data.anoLetivo, entrada.data.matricula);
  const referencia = db.collection(COLECOES.boletins).doc(id);
  const anterior = await referencia.get();

  const boletim = boletimSchema.safeParse({
    anoLetivo: entrada.data.anoLetivo,
    matricula: entrada.data.matricula,
    nome: aluno.nome,
    turmaId: aluno.turmaId,
    turmaCodigo: aluno.turmaCodigo,
    segmentoRotulo: aluno.segmento ? ROTULOS_DE_SEGMENTO[aluno.segmento] : undefined,
    recuperacoes: entrada.data.recuperacoes,
    eletivas: entrada.data.eletivas,
    dependencias: entrada.data.dependencias,
    projetoBilingue: entrada.data.projetoBilingue,
    observacoes: entrada.data.observacoes || null,
    origem: "portal",
  });

  if (!boletim.success) {
    return { ok: false, erro: boletim.error.issues[0]?.message };
  }

  // `disciplinas` fica de fora da gravação: é o retrato tirado no
  // fechamento do ano, e o schema o preencheria com uma lista vazia que
  // apagaria o retrato anterior.
  const campos = { ...boletim.data } as Partial<typeof boletim.data>;
  delete campos.disciplinas;

  await gravarComAuditoria({
    colecao: COLECOES.boletins,
    documentoId: id,
    antes: anterior.exists ? (anterior.data() as Boletim) : null,
    depois: campos,
    autor: sessao,
  });

  revalidatePath(`/gestao/boletins/${entrada.data.matricula}`);
  revalidatePath("/portal/boletim");

  return { ok: true };
}
