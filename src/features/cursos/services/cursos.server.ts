import "server-only";

import { COLECOES, type CursoComId } from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";
import {
  comCursosDoSistema,
  type CursoDaLista,
} from "@/features/cursos/domain/curso";

/**
 * Leitura dos cursos.
 *
 * Qualquer pessoa da equipe lê: o nome do curso aparece na ficha do aluno,
 * no boletim e no recibo, e esconder a lista só faria essas telas
 * imprimirem código em vez de nome.
 *
 * **O cadastro é somado aos cursos que o sistema já usa**, e não
 * substituído por eles. Era tudo ou nada — o padrão aparecia só com a
 * coleção vazia —, e o primeiro curso próprio que a escola criasse fazia
 * os outros quatro sumirem da tela e de todos os seletores. Foi relatado
 * assim: "ao criar um curso Personalizado, os outros cursos sumiram da
 * listagem". Ver `domain/curso.ts`.
 */
export async function listarCursos(): Promise<CursoDaLista[]> {
  const resultado = await getAdminDb().collection(COLECOES.cursos).get();

  return comCursosDoSistema(
    resultado.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CursoComId),
  );
}

/** Só os abertos entram nos seletores de turma e de aluno. */
export async function cursosAtivos(): Promise<CursoDaLista[]> {
  return (await listarCursos()).filter((curso) => curso.ativo);
}
