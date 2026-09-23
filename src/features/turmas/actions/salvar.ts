"use server";

import { revalidatePath } from "next/cache";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  disciplinaSchema,
  idDaTurma,
  ROTULOS_DE_SEGMENTO,
  ROTULOS_DE_TURNO,
  segmentoSchema,
  turmaSchema,
  turnoSchema,
} from "@/core/modelo";
import { chaveDeComparacao } from "@/features/migracao/domain/texto";
import { z } from "zod";

/**
 * Criação e edição de turmas e disciplinas.
 *
 * Cadastro estrutural é privilégio de secretaria e coordenação — o nível
 * `gerenciar` em `cadastros`. Professor e financeiro leem, não escrevem.
 */

export interface Resultado {
  ok: boolean;
  erro?: string;
  id?: string;
}

const formularioDeTurmaSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código da turma"),
  anoLetivo: z.coerce.number().int().min(2000).max(2100),
  segmento: segmentoSchema,
  turno: turnoSchema,
  ativa: z.boolean(),
});

export type FormularioDeTurma = z.infer<typeof formularioDeTurmaSchema>;

export async function salvarTurma(
  idExistente: string | null,
  dados: FormularioDeTurma,
): Promise<Resultado> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const formulario = formularioDeTurmaSchema.safeParse(dados);
  if (!formulario.success) {
    return { ok: false, erro: formulario.error.issues[0]?.message };
  }

  const { codigo, anoLetivo, segmento, turno, ativa } = formulario.data;

  // O id embute ano e código. Mudar qualquer um dos dois cria outra turma —
  // por isso, na edição, o id existente manda.
  const id = idExistente ?? idDaTurma(anoLetivo, codigo);

  const db = getAdminDb();
  const referencia = db.collection(COLECOES.turmas).doc(id);
  const atual = await referencia.get();

  if (!idExistente && atual.exists) {
    return { ok: false, erro: `Já existe a turma ${codigo} em ${anoLetivo}.` };
  }

  const turma = turmaSchema.safeParse({
    codigo,
    anoLetivo,
    segmento,
    segmentoRotulo: ROTULOS_DE_SEGMENTO[segmento],
    turno,
    turnoRotulo: ROTULOS_DE_TURNO[turno],
    ativa,
    origem: atual.exists ? (atual.data()?.origem ?? "portal") : "portal",
  });

  if (!turma.success) {
    return { ok: false, erro: turma.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.turmas,
    documentoId: id,
    antes: atual.exists ? (atual.data() ?? null) : null,
    depois: turma.data,
    autor: sessao,
  });

  revalidatePath("/gestao/turmas");
  revalidatePath(`/gestao/turmas/${id}`);

  return { ok: true, id };
}

const formularioDeDisciplinaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da disciplina"),
  sigla: z.string().trim(),
  ativa: z.boolean(),
});

export type FormularioDeDisciplina = z.infer<
  typeof formularioDeDisciplinaSchema
>;

export async function salvarDisciplina(
  idExistente: string | null,
  dados: FormularioDeDisciplina,
): Promise<Resultado> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const formulario = formularioDeDisciplinaSchema.safeParse(dados);
  if (!formulario.success) {
    return { ok: false, erro: formulario.error.issues[0]?.message };
  }

  const { nome, sigla, ativa } = formulario.data;

  // O id vem do nome sem acento — é o que consolidou
  // `PORTUGUES/LITERATURA` e `PORTUGUÊS/LITERATURA` na migração, e continua
  // impedindo a mesma matéria de entrar duas vezes com grafias diferentes.
  const id = idExistente ?? idDeTexto(nome);

  const db = getAdminDb();
  const referencia = db.collection(COLECOES.disciplinas).doc(id);
  const atual = await referencia.get();

  if (!idExistente && atual.exists) {
    return {
      ok: false,
      erro: `Já existe a disciplina "${atual.data()?.nome ?? nome}".`,
    };
  }

  const anteriores = (atual.data()?.grafiasOriginais as string[]) ?? [];

  const disciplina = disciplinaSchema.safeParse({
    nome,
    sigla,
    grafiasOriginais: [...new Set([...anteriores, nome])],
    ativa,
    origem: atual.exists ? (atual.data()?.origem ?? "portal") : "portal",
  });

  if (!disciplina.success) {
    return { ok: false, erro: disciplina.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.disciplinas,
    documentoId: id,
    antes: atual.exists ? (atual.data() ?? null) : null,
    depois: disciplina.data,
    autor: sessao,
  });

  revalidatePath("/gestao/disciplinas");

  return { ok: true, id };
}

function idDeTexto(valor: string): string {
  return (
    chaveDeComparacao(valor)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "sem-nome"
  );
}
