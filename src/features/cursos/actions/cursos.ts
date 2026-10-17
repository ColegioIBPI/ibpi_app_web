"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gravarComAuditoria } from "@/core/auditoria/registrar";
import { exigirPermissao } from "@/core/auth/guards";
import { getAdminDb } from "@/core/firebase/admin";
import {
  COLECOES,
  CURSOS_PADRAO,
  cursoSchema,
  type Curso,
} from "@/core/modelo";
import { codigoDoCurso } from "@/features/cursos/domain/curso";

/**
 * Cadastro dos cursos.
 *
 * Quem administra a estrutura da escola: secretaria, coordenação e
 * administração — o mesmo dono de turmas e disciplinas.
 */

export interface ResultadoDoCurso {
  ok: boolean;
  erro?: string;
  codigo?: string;
}

function revalidar() {
  revalidatePath("/gestao/configuracoes");
  revalidatePath("/gestao/configuracoes/cursos");
  revalidatePath("/gestao/turmas");
}

const novoCursoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do curso"),
  sigla: z.string().trim().nullable().default(null),
  ordem: z.number().int().nullable().default(null),
});

export async function criarCurso(
  dados: z.infer<typeof novoCursoSchema>,
): Promise<ResultadoDoCurso> {
  const entrada = novoCursoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("cadastros", "gerenciar");

  // O código sai do nome, e não de um campo digitado: ele vira id de
  // documento e é referenciado por aluno, turma e boletim.
  const codigo = codigoDoCurso(entrada.data.nome);
  if (!codigo) {
    return { ok: false, erro: "O nome precisa ter letras ou números." };
  }

  const db = getAdminDb();
  const referencia = db.collection(COLECOES.cursos).doc(codigo);

  // Recriar um curso existente zeraria a ordem e o estado dele; e se fosse
  // um encerrado, reabriria sem ninguém pedir.
  if ((await referencia.get()).exists) {
    return { ok: false, erro: `Já existe um curso com o código ${codigo}.` };
  }

  const curso = cursoSchema.safeParse({
    codigo,
    nome: entrada.data.nome,
    sigla: entrada.data.sigla,
    ordem: entrada.data.ordem,
    ativo: true,
    origem: "portal",
  });

  if (!curso.success) {
    return { ok: false, erro: curso.error.issues[0]?.message };
  }

  await gravarComAuditoria({
    colecao: COLECOES.cursos,
    documentoId: codigo,
    antes: null,
    depois: curso.data,
    autor: sessao,
  });

  revalidar();

  return { ok: true, codigo };
}

const edicaoSchema = z.object({
  codigo: z.string().trim().min(1),
  nome: z.string().trim().min(2, "Informe o nome do curso"),
  sigla: z.string().trim().nullable().default(null),
  ordem: z.number().int().nullable().default(null),
});

/**
 * Renomear é seguro; o código **não** muda.
 *
 * O código é a chave que aluno, turma, boletim e aviso guardam. Trocá-lo
 * deixaria todos eles apontando para um curso que não existe mais, e o
 * estrago apareceria no boletim de quem já estava matriculado.
 */
export async function editarCurso(
  dados: z.infer<typeof edicaoSchema>,
): Promise<ResultadoDoCurso> {
  const entrada = edicaoSchema.safeParse(dados);
  if (!entrada.success) {
    return { ok: false, erro: entrada.error.issues[0]?.message };
  }

  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const db = getAdminDb();

  const referencia = db.collection(COLECOES.cursos).doc(entrada.data.codigo);
  const atual = await referencia.get();

  if (!atual.exists) {
    return { ok: false, erro: "Curso não encontrado." };
  }

  await gravarComAuditoria({
    colecao: COLECOES.cursos,
    documentoId: entrada.data.codigo,
    antes: atual.data() as Curso,
    depois: {
      nome: entrada.data.nome,
      sigla: entrada.data.sigla,
      ordem: entrada.data.ordem,
    },
    autor: sessao,
  });

  revalidar();

  return { ok: true, codigo: entrada.data.codigo };
}

/**
 * Encerra ou reabre um curso.
 *
 * **Não existe apagar.** Aluno formado, boletim e recibo antigos apontam
 * para o curso, e sumir com ele deixaria o histórico sem nome — exatamente
 * o documento que alguém pede anos depois. Encerrado some dos seletores e
 * continua existindo.
 */
export async function alternarCurso(
  codigo: string,
  ativo: boolean,
): Promise<ResultadoDoCurso> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const db = getAdminDb();

  const referencia = db.collection(COLECOES.cursos).doc(codigo);
  const atual = await referencia.get();

  if (!atual.exists) {
    return { ok: false, erro: "Curso não encontrado." };
  }

  await gravarComAuditoria({
    colecao: COLECOES.cursos,
    documentoId: codigo,
    antes: atual.data() as Curso,
    depois: { ativo },
    autor: sessao,
  });

  revalidar();

  return { ok: true, codigo };
}

/**
 * Grava os quatro cursos que o sistema já usava.
 *
 * Roda quando a tela é aberta e o cadastro ainda está vazio. Até aqui a
 * lista existia só como constante no código, e as telas liam dali; a partir
 * do momento em que alguém abre Configurações, ela vira dado de verdade e
 * pode ser editada.
 *
 * Idempotente: curso já existente é pulado, então reabrir a tela não
 * desfaz renomeação nenhuma.
 */
export async function semearCursos(): Promise<ResultadoDoCurso> {
  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const db = getAdminDb();

  for (const padrao of CURSOS_PADRAO) {
    const referencia = db.collection(COLECOES.cursos).doc(padrao.codigo);
    if ((await referencia.get()).exists) continue;

    await gravarComAuditoria({
      colecao: COLECOES.cursos,
      documentoId: padrao.codigo,
      antes: null,
      depois: cursoSchema.parse({
        ...padrao,
        sigla: null,
        ativo: true,
        origem: "portal",
      }),
      autor: sessao,
    });
  }

  revalidar();

  return { ok: true };
}
