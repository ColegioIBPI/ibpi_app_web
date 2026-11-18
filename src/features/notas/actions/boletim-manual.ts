"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  boletimManualSchema,
  COLUNAS_DO_BOLETIM,
  idDoBoletimManual,
  linhaDoBoletimSchema,
  COLECOES,
  type BoletimManual,
} from "@/core/modelo";
import { copiarDoCalculado } from "@/features/notas/domain/boletim-manual";
import { boletimDoAluno } from "@/features/notas/services/notas.server";

/**
 * O boletim 2: criar a cópia, editar e dizer qual vale.
 *
 * Tudo aqui exige `notas: gerenciar` — secretaria, coordenação e
 * administração. O professor lança nota; **substituir o boletim de um
 * aluno é ato de secretaria**, e sai na auditoria com nome e hora.
 */

export interface ResultadoDoBoletimManual {
  ok: boolean;
  erro?: string;
}

const chaveSchema = z.object({
  matricula: z.string().min(1),
  anoLetivo: z.coerce.number().int(),
});

/**
 * Tira o retrato do boletim calculado.
 *
 * Recusa quando já existe: refazer a cópia apagaria o que a secretaria
 * digitou, e essa é a gravação que não se desfaz. Para recomeçar do
 * calculado existe `recopiar`, que diz o que vai perder.
 */
export async function criarBoletimManual(
  dados: z.infer<typeof chaveSchema>,
): Promise<ResultadoDoBoletimManual> {
  const entrada = chaveSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("notas", "gerenciar");
  const { matricula, anoLetivo } = entrada.data;

  const referencia = getAdminDb()
    .collection(COLECOES.boletinsManuais)
    .doc(idDoBoletimManual(anoLetivo, matricula));

  if ((await referencia.get()).exists) {
    return { ok: false, erro: "Este aluno já tem um boletim 2." };
  }

  const calculado = await boletimDoAluno(sessao, matricula, anoLetivo);
  if (!calculado) return { ok: false, erro: "Aluno não encontrado." };

  const documento = boletimManualSchema.safeParse({
    anoLetivo,
    matricula,
    nome: calculado.nome,
    /*
      `null` explícito, e não ausente: o Firestore recusa `undefined`, e
      um campo `nullish` sem valor sai exatamente assim do schema. O
      boletim 2 identifica o aluno pela matrícula — a turma entra só como
      rótulo, e para isso basta `turmaCodigo`.
    */
    turmaId: null,
    turmaCodigo: calculado.turmaCodigo,
    segmentoRotulo: calculado.segmentoRotulo,
    serie: calculado.serie,
    dataMatricula: calculado.dataMatricula,
    titulo: "Boletim 2",
    // Nasce **não oficial**: a família continua vendo o calculado até
    // alguém conferir a cópia e marcar a caixa.
    oficial: false,
    ...copiarDoCalculado({
      disciplinas: calculado.disciplinas,
      faltasPorTrimestre: calculado.faltasPorTrimestre,
      percentualDeFrequencia: calculado.percentualDeFrequencia,
      situacao: calculado.situacao,
      observacoes: calculado.documento?.observacoes ?? null,
    }),
    copiadoEm: new Date().toISOString(),
    copiadoPorNome: sessao.nome,
    origem: "portal",
  });

  if (!documento.success) {
    return { ok: false, erro: documento.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.boletinsManuais,
    documentoId: referencia.id,
    antes: null,
    depois: documento.data,
    autor: sessao,
  });

  revalidar(matricula);

  return { ok: true };
}

const edicaoSchema = chaveSchema.extend({
  titulo: z.string().trim().min(1).optional(),
  observacoes: z.string().trim().nullable().optional(),
  rotulos: z.partialRecord(z.enum(COLUNAS_DO_BOLETIM), z.string().trim().min(1)).optional(),
  ocultas: z.array(z.enum(COLUNAS_DO_BOLETIM)).optional(),
  disciplinas: z.array(linhaDoBoletimSchema).optional(),
  faltasPorTrimestre: z.record(z.string(), z.number().int().min(0)).optional(),
});

export type EdicaoDoBoletimManual = z.infer<typeof edicaoSchema>;

/**
 * Grava o que a secretaria mudou.
 *
 * Campo ausente fica como está: a tela salva um bloco por vez — os
 * rótulos, ou as linhas —, e mandar o documento inteiro a cada clique
 * faria uma edição desfazer a outra quando duas pessoas estão na tela.
 */
export async function salvarBoletimManual(
  dados: EdicaoDoBoletimManual,
): Promise<ResultadoDoBoletimManual> {
  const entrada = edicaoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("notas", "gerenciar");
  const { matricula, anoLetivo, ...mudanca } = entrada.data;

  const referencia = getAdminDb()
    .collection(COLECOES.boletinsManuais)
    .doc(idDoBoletimManual(anoLetivo, matricula));

  const atual = await referencia.get();
  if (!atual.exists) return { ok: false, erro: "Boletim 2 não encontrado." };

  const depois = Object.fromEntries(
    Object.entries(mudanca).filter(([, valor]) => valor !== undefined),
  );

  if (Object.keys(depois).length === 0) return { ok: true };

  await gravarComAuditoria({
    colecao: COLECOES.boletinsManuais,
    documentoId: referencia.id,
    antes: atual.data() as BoletimManual,
    depois,
    autor: sessao,
  });

  revalidar(matricula);

  return { ok: true };
}

/**
 * Diz qual boletim a família vê.
 *
 * É a gravação com consequência externa desta tela: marcada, o Portal e a
 * impressão passam a entregar o boletim 2, e o calculado some para o
 * aluno e para o responsável.
 */
export async function marcarBoletimOficial(
  dados: z.infer<typeof chaveSchema> & { oficial: boolean },
): Promise<ResultadoDoBoletimManual> {
  const entrada = chaveSchema.extend({ oficial: z.boolean() }).safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("notas", "gerenciar");
  const { matricula, anoLetivo, oficial } = entrada.data;

  const referencia = getAdminDb()
    .collection(COLECOES.boletinsManuais)
    .doc(idDoBoletimManual(anoLetivo, matricula));

  const atual = await referencia.get();
  if (!atual.exists) return { ok: false, erro: "Boletim 2 não encontrado." };

  await gravarComAuditoria({
    colecao: COLECOES.boletinsManuais,
    documentoId: referencia.id,
    antes: atual.data() as BoletimManual,
    depois: { oficial },
    autor: sessao,
  });

  revalidar(matricula);

  return { ok: true };
}

/** Apaga o boletim 2 e devolve o calculado ao lugar dele. */
export async function excluirBoletimManual(
  dados: z.infer<typeof chaveSchema>,
): Promise<ResultadoDoBoletimManual> {
  const entrada = chaveSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("notas", "gerenciar");
  const { matricula, anoLetivo } = entrada.data;

  const db = getAdminDb();
  const referencia = db
    .collection(COLECOES.boletinsManuais)
    .doc(idDoBoletimManual(anoLetivo, matricula));

  const atual = await referencia.get();
  if (!atual.exists) return { ok: true };

  /*
    Apaga de verdade, e não desativa: um boletim 2 guardado e invisível
    seria um documento da escola fora da vista de todo mundo. O que
    existiu fica na auditoria, com os valores que tinha.
  */
  const lote = db.batch();
  lote.delete(referencia);
  lote.set(db.collection(COLECOES.auditoria).doc(), {
    colecao: COLECOES.boletinsManuais,
    documentoId: referencia.id,
    acao: "excluiu",
    alteracoes: { oficial: { de: atual.data()?.oficial ?? false, para: null } },
    autorUid: sessao.uid,
    autorNome: sessao.nome,
    autorPerfil: sessao.role,
    em: new Date().toISOString(),
  });

  await lote.commit();

  revalidar(matricula);

  return { ok: true };
}

function revalidar(matricula: string) {
  revalidatePath(`/gestao/boletins/${matricula}`);
  revalidatePath(`/gestao/boletins/${matricula}/manual`);
  revalidatePath("/gestao/boletins");
  revalidatePath("/portal/boletim");
}
