import "server-only";

import { COLECOES, CURSOS_PADRAO, type CursoComId } from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";
import { ordenarCursos } from "@/features/cursos/domain/curso";

/**
 * Leitura dos cursos.
 *
 * Qualquer pessoa da equipe lê: o nome do curso aparece na ficha do aluno,
 * no boletim e no recibo, e esconder a lista só faria essas telas
 * imprimirem código em vez de nome.
 *
 * **Cadastro vazio devolve os quatro padrões.** O colégio tem alunos e
 * turmas desde antes desta tela existir, e uma lista vazia faria a ficha
 * deles perder o curso até alguém abrir Configurações. A semente é gravada
 * de verdade na primeira vez que a tela é aberta.
 */
export async function listarCursos(): Promise<CursoComId[]> {
  const resultado = await getAdminDb().collection(COLECOES.cursos).get();

  if (resultado.empty) {
    return ordenarCursos(
      CURSOS_PADRAO.map((curso) => ({
        ...curso,
        id: curso.codigo,
        sigla: null,
        ativo: true,
        origem: "portal" as const,
      })),
    );
  }

  return ordenarCursos(
    resultado.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CursoComId),
  );
}

/** Só os abertos entram nos seletores de turma e de aluno. */
export async function cursosAtivos(): Promise<CursoComId[]> {
  return (await listarCursos()).filter((curso) => curso.ativo);
}
