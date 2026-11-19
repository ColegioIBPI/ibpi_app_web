"use server";

import { revalidatePath } from "next/cache";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { sincronizarChavesDoAluno } from "@/features/avisos/services/chaves.server";
import { exigirPermissao } from "@/core/auth/guards";
import { anoLetivoEscolhido } from "@/core/escola/ano-letivo.server";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, matriculaSchema, type Turma } from "@/core/modelo";
import {
  formularioDoAlunoSchema,
  paraAluno,
  type FormularioDoAluno,
} from "@/features/alunos/domain/formulario";
import {
  camposDaSituacao,
  idDaMatriculaDoAno,
} from "@/features/alunos/domain/matricula-do-ano";
import { propagarSituacaoParaOAno } from "@/features/alunos/services/matricula-do-ano.server";

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
  const anoLetivo = await anoLetivoEscolhido();

  // Trocar a turma pelo código exige reapontar o vínculo. Deixar só o
  // código atualizado criaria um aluno que "está" numa turma e aparece na
  // lista de outra — o `turmaId` é o que as consultas usam.
  const vinculo = await resolverVinculoDeTurma(
    aluno.turmaCodigo ?? null,
    anterior.turmaCodigo as string | undefined,
    anoLetivo,
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

  /*
    O registro de matrícula do ano é quem responde "o que foi deste aluno
    em 2026" — turma, série, turno e situação daquele ano. A ficha mexe
    nas duas coisas que ele guarda, e sem levá-las para lá o aluno
    ficaria fora da lista do ano, do boletim e da ata, sem erro nenhum na
    tela.
  */
  if (vinculo.turma) {
    // Turma nova: o registro daquele ano nasce (ou se refaz) inteiro.
    await getAdminDb()
      .collection(COLECOES.matriculas)
      .doc(idDaMatriculaDoAno(vinculo.turma.anoLetivo, matricula))
      .set(
        matriculaSchema.parse({
          matricula,
          nome: aluno.nome,
          anoLetivo: vinculo.turma.anoLetivo,
          turmaId: vinculo.turma.id,
          turmaCodigo: vinculo.turma.codigo,
          segmento: vinculo.turma.segmento,
          serie: aluno.serie ?? "",
          turno: vinculo.turma.turno,
          ...camposDaSituacao({
            situacaoMatricula: aluno.situacaoMatricula,
            dataDaSituacao: aluno.dataDaSituacao ?? null,
          }),
          origem: "portal",
        }),
        { merge: true },
      );
  } else if ("situacaoMatricula" in alteracoes || "dataDaSituacao" in alteracoes) {
    // Só a situação mudou: o registro do ano continua o mesmo, com a
    // situação nova.
    await propagarSituacaoParaOAno(anoLetivo, matricula, {
      situacaoMatricula: aluno.situacaoMatricula,
      dataDaSituacao: aluno.dataDaSituacao ?? null,
    });
  }

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
  /** A turma resolvida, quando houve troca para uma turma de verdade. */
  turma?: Turma & { id: string };
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
  anoLetivo: number,
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

  const candidatas = encontradas.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Turma),
  }));

  /*
    A mesma `EM1A` existe uma vez por ano letivo. Vale a do **ano em que
    a secretaria está trabalhando** — pegar a mais recente colocaria em
    2027 o aluno de quem só se corrigiu o nome em 2026.
  */
  const turma =
    candidatas.find((item) => item.anoLetivo === anoLetivo) ??
    [...candidatas].sort((a, b) => b.anoLetivo - a.anoLetivo)[0];

  return {
    turma,
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
