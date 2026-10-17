import "server-only";

import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type CriterioComId } from "@/core/modelo";
import type { SessionUser } from "@/core/auth/session";
import { obterAlunoVisivel } from "@/features/alunos/services/alunos.server";
import {
  agruparCriterios,
  criterioQueVale,
  type GrupoDeCriterio,
} from "@/features/cursos/domain/criterio";
import { rotuloDoCurso } from "@/features/cursos/domain/curso";
import { listarCursos } from "@/features/cursos/services/cursos.server";

/**
 * Leitura dos critérios de avaliação.
 *
 * O id é o ano letivo — ou `{ano}-{curso}` quando o critério é de um curso
 * só. O de 2026 não substitui o de 2025: boletim fechado continua valendo
 * pelo critério do ano dele.
 */

export function idDoCriterio(anoLetivo: number, cursoCodigo: string | null) {
  return cursoCodigo ? `${anoLetivo}-${cursoCodigo}` : String(anoLetivo);
}

export async function listarCriterios(): Promise<CriterioComId[]> {
  const resultado = await getAdminDb()
    .collection(COLECOES.criteriosDeAvaliacao)
    .orderBy("anoLetivo", "desc")
    .get();

  return resultado.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as CriterioComId,
  );
}

export async function obterCriterio(id: string): Promise<CriterioComId | null> {
  const doc = await getAdminDb()
    .collection(COLECOES.criteriosDeAvaliacao)
    .doc(id)
    .get();

  return doc.exists ? ({ id: doc.id, ...doc.data() } as CriterioComId) : null;
}

/**
 * O critério que a família lê, para um ano e um curso.
 *
 * Lê os **dois candidatos** por id em vez de consultar a coleção: são duas
 * leituras diretas, sem índice composto, e o id já carrega a regra de
 * escolha. A preferência — o do curso ganha do geral — fica em
 * `domain/criterio.ts`, testada.
 */
export async function criterioPublicado(
  anoLetivo: number,
  cursoCodigo: string | null,
  apenasPublicados = true,
): Promise<CriterioComId | null> {
  const db = getAdminDb();

  const ids = cursoCodigo
    ? [idDoCriterio(anoLetivo, cursoCodigo), idDoCriterio(anoLetivo, null)]
    : [idDoCriterio(anoLetivo, null)];

  const docs = await db.getAll(
    ...ids.map((id) => db.collection(COLECOES.criteriosDeAvaliacao).doc(id)),
  );

  const encontrados = docs
    .filter((doc) => doc.exists)
    .map((doc) => ({ id: doc.id, ...doc.data() }) as CriterioComId);

  return criterioQueVale(encontrados, anoLetivo, cursoCodigo, apenasPublicados);
}

/**
 * Os critérios que valem para os filhos de uma família.
 *
 * Lido por aluno porque é o **curso do aluno** que decide qual critério
 * vale, e o Portal de "Informações úteis" não tem um aluno selecionado.
 */
export async function criteriosDaFamilia(
  sessao: SessionUser,
  anoLetivo: number,
): Promise<Array<GrupoDeCriterio<CriterioComId>>> {
  const matriculas =
    sessao.role === "aluno"
      ? sessao.matricula
        ? [sessao.matricula]
        : []
      : sessao.alunosVinculados;

  if (matriculas.length === 0) return [];

  const cursos = await listarCursos();

  const itens = await Promise.all(
    matriculas.map(async (matricula) => {
      const aluno = await obterAlunoVisivel(sessao, matricula);
      const cursoCodigo = aluno?.segmento ?? null;

      return {
        cursoRotulo: rotuloDoCurso(cursoCodigo, cursos),
        criterio: await criterioPublicado(anoLetivo, cursoCodigo),
      };
    }),
  );

  return agruparCriterios(itens);
}
