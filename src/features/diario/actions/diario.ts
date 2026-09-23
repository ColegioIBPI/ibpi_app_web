"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  aulaSchema,
  COLECOES,
  dataSchema,
  diarioDeClasseSchema,
  trimestreSchema,
  type Alocacao,
  type Aula,
  type DiarioDeClasse,
  type Trimestre,
} from "@/core/modelo";
import {
  definirPresenca,
  idDoDiario,
  ordenarAulas,
  proximoNumero,
  verificarDataRepetida,
} from "@/features/diario/domain/aulas";
import { idDoProfessor } from "@/features/diario/services/diario.server";

/**
 * Escrita do diário de classe.
 *
 * O professor registra aula, conteúdo e chamada das turmas dele. A
 * verificação de escopo é feita aqui: o Admin SDK ignora as Security Rules,
 * e o diário de outra turma contém falta e nome de aluno.
 */

export interface ResultadoDoDiario {
  ok: boolean;
  erro?: string;
}

const contextoSchema = z.object({
  alocacaoId: z.string().min(1),
  trimestre: trimestreSchema,
});

const novaAulaSchema = contextoSchema.extend({
  data: dataSchema,
  conteudo: z.string().trim(),
  semAula: z
    .enum(["ferias", "recesso", "ponte", "feriado"])
    .nullable()
    .default(null),
});

export type NovaAula = z.infer<typeof novaAulaSchema>;

export async function registrarAula(
  dados: NovaAula,
): Promise<ResultadoDoDiario> {
  const entrada = novaAulaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const contexto = await abrir(entrada.data.alocacaoId, entrada.data.trimestre);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  const { sessao, alocacao, diario, referencia } = contexto;
  const aulas = diario?.aulas ?? [];

  const repetida = verificarDataRepetida(aulas, entrada.data.data);
  if (!repetida.ok) return { ok: false, erro: repetida.erro };

  const nova = aulaSchema.safeParse({
    numero: proximoNumero(aulas),
    data: entrada.data.data,
    conteudo: entrada.data.conteudo || null,
    semAula: entrada.data.semAula,
    presencas: {},
  });

  if (!nova.success) {
    return { ok: false, erro: nova.error.issues[0]?.message };
  }

  await gravar(
    referencia,
    diario,
    alocacao,
    entrada.data.trimestre,
    ordenarAulas([...aulas, nova.data]),
    sessao,
  );

  revalidar(entrada.data.alocacaoId, entrada.data.trimestre);

  return { ok: true };
}

const conteudoSchema = contextoSchema.extend({
  numero: z.number().int().positive(),
  conteudo: z.string().trim(),
});

export async function registrarConteudo(
  dados: z.infer<typeof conteudoSchema>,
): Promise<ResultadoDoDiario> {
  const entrada = conteudoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const contexto = await abrir(entrada.data.alocacaoId, entrada.data.trimestre);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  const { sessao, alocacao, diario, referencia } = contexto;
  if (!diario) return { ok: false, erro: "Registre a aula primeiro." };

  const aulas = diario.aulas.map((aula) =>
    aula.numero === entrada.data.numero
      ? { ...aula, conteudo: entrada.data.conteudo || null }
      : aula,
  );

  await gravar(
    referencia,
    diario,
    alocacao,
    entrada.data.trimestre,
    aulas,
    sessao,
  );
  revalidar(entrada.data.alocacaoId, entrada.data.trimestre);

  return { ok: true };
}

const chamadaSchema = contextoSchema.extend({
  numero: z.number().int().positive(),
  /** Matrículas que faltaram. Quem não está aqui esteve presente. */
  faltas: z.array(z.string()),
});

export async function registrarChamadaDaAula(
  dados: z.infer<typeof chamadaSchema>,
): Promise<ResultadoDoDiario> {
  const entrada = chamadaSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const contexto = await abrir(entrada.data.alocacaoId, entrada.data.trimestre);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  const { sessao, alocacao, diario, referencia } = contexto;
  if (!diario) return { ok: false, erro: "Registre a aula primeiro." };

  const faltas = new Set(entrada.data.faltas);

  const aulas = diario.aulas.map((aula) => {
    if (aula.numero !== entrada.data.numero) return aula;

    // Recompõe as presenças do zero: enviar a lista completa de faltas
    // evita o estado intermediário em que remover uma falta na tela não
    // chega ao banco.
    let atualizada: Aula = { ...aula, presencas: {} };
    for (const matricula of faltas) {
      atualizada = definirPresenca(atualizada, matricula, false);
    }

    return atualizada;
  });

  await gravar(
    referencia,
    diario,
    alocacao,
    entrada.data.trimestre,
    aulas,
    sessao,
  );
  revalidar(entrada.data.alocacaoId, entrada.data.trimestre);

  return { ok: true };
}

const remocaoSchema = contextoSchema.extend({
  numero: z.number().int().positive(),
});

export async function removerAula(
  dados: z.infer<typeof remocaoSchema>,
): Promise<ResultadoDoDiario> {
  const entrada = remocaoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const contexto = await abrir(entrada.data.alocacaoId, entrada.data.trimestre);
  if ("erro" in contexto) return { ok: false, erro: contexto.erro };

  const { sessao, alocacao, diario, referencia } = contexto;
  if (!diario) return { ok: false, erro: "Diário não encontrado." };

  const aulas = diario.aulas.filter(
    (aula) => aula.numero !== entrada.data.numero,
  );

  await gravar(
    referencia,
    diario,
    alocacao,
    entrada.data.trimestre,
    aulas,
    sessao,
  );
  revalidar(entrada.data.alocacaoId, entrada.data.trimestre);

  return { ok: true };
}

/** Carrega o contexto e verifica o escopo — usado por todas as ações. */
async function abrir(alocacaoId: string, trimestre: Trimestre) {
  const sessao = await exigirPermissao("frequencia", "lancar");
  const db = getAdminDb();

  const alocacaoDoc = await db
    .collection(COLECOES.alocacoes)
    .doc(alocacaoId)
    .get();

  if (!alocacaoDoc.exists) {
    return { erro: "Alocação não encontrada." as const };
  }

  const alocacao = alocacaoDoc.data() as Alocacao;

  if (sessao.role === "professor") {
    const meuId = await idDoProfessor(sessao.uid);
    if (alocacao.professorId !== meuId) {
      return { erro: "Este diário é de outro professor." as const };
    }
  }

  const referencia = db
    .collection(COLECOES.diarioClasse)
    .doc(idDoDiario(alocacaoId, trimestre));

  const doc = await referencia.get();

  return {
    sessao,
    alocacao,
    referencia,
    diario: doc.exists ? (doc.data() as DiarioDeClasse) : null,
  };
}

async function gravar(
  referencia: FirebaseFirestore.DocumentReference,
  anterior: DiarioDeClasse | null,
  alocacao: Alocacao,
  trimestre: Trimestre,
  aulas: Aula[],
  sessao: Awaited<ReturnType<typeof exigirPermissao>>,
) {
  const diario = diarioDeClasseSchema.safeParse({
    anoLetivo: alocacao.anoLetivo,
    trimestre,
    alocacaoId: referencia.id.replace(/-t\d$/, ""),
    professorId: alocacao.professorId,
    professorNome: alocacao.professorNome,
    turmaId: alocacao.turmaId,
    turmaCodigo: alocacao.turmaCodigo,
    disciplinaId: alocacao.disciplinaId,
    disciplinaNome: alocacao.disciplinaNome,
    aulas,
    avaliacoesDeTrabalho: anterior?.avaliacoesDeTrabalho ?? [],
    origem: "portal",
  });

  if (!diario.success) throw new Error(diario.error.issues[0]?.message);

  await gravarComAuditoria({
    colecao: COLECOES.diarioClasse,
    documentoId: referencia.id,
    antes: anterior,
    depois: diario.data,
    autor: sessao,
  });
}

function revalidar(alocacaoId: string, trimestre: Trimestre) {
  revalidatePath("/gestao/diario");
  revalidatePath(`/gestao/diario/${alocacaoId}`);
  void trimestre;
}
