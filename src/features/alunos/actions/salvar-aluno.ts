"use server";

import { revalidatePath } from "next/cache";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { sincronizarChavesDoAluno } from "@/features/avisos/services/chaves.server";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Turma } from "@/core/modelo";
import {
  formularioDoAlunoSchema,
  paraAluno,
  type FormularioDoAluno,
} from "@/features/alunos/domain/formulario";

/**
 * Salva a edição do cadastro do aluno.
 *
 * Roda no servidor com o Admin SDK, que ignora as Security Rules — então
 * tudo que a regra garantiria precisa ser garantido aqui: perfil, escopo e
 * auditoria.
 */

export interface ResultadoDeSalvar {
  ok: boolean;
  erro?: string;
  /** Quantos campos mudaram. Zero significa "salvou sem alterar nada". */
  camposAlterados?: number;
}

export async function salvarAluno(
  matricula: string,
  dados: FormularioDoAluno,
): Promise<ResultadoDeSalvar> {
  // Editar cadastro é privilégio de secretaria e coordenação. Professor lê,
  // não escreve.
  const sessao = await exigirPermissao("cadastros", "gerenciar");

  const formulario = formularioDoAlunoSchema.safeParse(dados);
  if (!formulario.success) {
    return { ok: false, erro: primeiroErro(formulario.error.issues) };
  }

  const db = getAdminDb();
  const referencia = db.collection(COLECOES.alunos).doc(matricula);
  const atual = await referencia.get();

  if (!atual.exists) {
    return { ok: false, erro: "Aluno não encontrado." };
  }

  const aluno = paraAluno(formulario.data);
  const anterior = atual.data() ?? {};

  // Trocar a turma pelo código exige reapontar o vínculo. Deixar só o
  // código atualizado criaria um aluno que "está" numa turma e aparece na
  // lista de outra — o `turmaId` é o que as consultas usam.
  const vinculo = await resolverVinculoDeTurma(
    aluno.turmaCodigo ?? null,
    anterior.turmaCodigo as string | undefined,
  );

  if (vinculo.erro) {
    return { ok: false, erro: vinculo.erro };
  }

  const alteracoes = await gravarComAuditoria({
    colecao: COLECOES.alunos,
    documentoId: matricula,
    antes: anterior,
    depois: { ...aluno, ...vinculo.campos },
    autor: sessao,
  });

  // Turma e segmento do aluno viram chave de aviso — dele e de quem o
  // acompanha. Sem refazer as chaves, o aviso da turma nova não chegaria à
  // família, e sem erro nenhum na tela.
  if ("turmaId" in alteracoes || "segmento" in alteracoes) {
    await sincronizarChavesDoAluno(matricula);
  }

  revalidatePath("/gestao/alunos");
  revalidatePath(`/gestao/alunos/${matricula}`);

  return { ok: true, camposAlterados: Object.keys(alteracoes).length };
}

interface VinculoDeTurma {
  campos: Record<string, unknown>;
  erro?: string;
}

/**
 * Traduz o código da turma nos campos derivados.
 *
 * Quando o código não mudou, devolve vazio: não tocar é melhor que
 * reescrever com o mesmo valor, porque mantém a auditoria limpa.
 */
async function resolverVinculoDeTurma(
  codigoNovo: string | null,
  codigoAnterior: string | undefined,
): Promise<VinculoDeTurma> {
  if ((codigoNovo ?? null) === (codigoAnterior ?? null)) return { campos: {} };

  // Turma apagada do cadastro: o aluno fica sem vínculo, o que é um estado
  // legítimo (aluno matriculado mas ainda sem turma definida).
  if (!codigoNovo) {
    return {
      campos: { turmaId: null, segmento: null, turno: null },
    };
  }

  const encontradas = await getAdminDb()
    .collection(COLECOES.turmas)
    .where("codigo", "==", codigoNovo)
    .get();

  if (encontradas.empty) {
    return {
      campos: {},
      erro: `Não existe a turma "${codigoNovo}". Cadastre-a em Turmas antes de vincular o aluno.`,
    };
  }

  // Havendo a mesma turma em mais de um ano letivo, vale a mais recente.
  const turma = encontradas.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Turma) }))
    .sort((a, b) => b.anoLetivo - a.anoLetivo)[0];

  return {
    campos: {
      turmaId: turma.id,
      segmento: turma.segmento,
      turno: turma.turno,
    },
  };
}

function primeiroErro(issues: { message: string; path: PropertyKey[] }[]) {
  const issue = issues[0];
  if (!issue) return "Dados inválidos.";

  const campo = issue.path.join(".");
  return campo ? `${campo}: ${issue.message}` : issue.message;
}
