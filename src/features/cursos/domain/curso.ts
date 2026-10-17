import { ROTULOS_DE_SEGMENTO, type Curso } from "@/core/modelo";

/**
 * Como se lê um curso.
 *
 * O ponto desta camada é **nunca deixar aparecer `undefined` no lugar do
 * nome do curso**. Antes do cadastro, o rótulo vinha de um objeto com as
 * quatro chaves conhecidas, e indexá-lo com um código que não existe
 * devolve `undefined` em silêncio — o boletim imprimiria "Curso: " e
 * ninguém veria até a família reclamar.
 */

export type ParaRotulo = Pick<Curso, "codigo" | "nome">;

/**
 * O nome do curso, com duas quedas de segurança.
 *
 * 1. o cadastro, que é a verdade do colégio;
 * 2. os quatro rótulos que o sistema já trazia, para quem renderiza sem ter
 *    o cadastro em mãos — scripts de migração, por exemplo;
 * 3. o próprio código, que é feio e **é informação**: "tecnico" diz muito
 *    mais que um espaço em branco sobre o que deu errado.
 */
export function rotuloDoCurso(
  codigo: string | null | undefined,
  cursos: ParaRotulo[] = [],
): string {
  if (!codigo) return "—";

  const cadastrado = cursos.find((curso) => curso.codigo === codigo);
  if (cadastrado) return cadastrado.nome;

  return ROTULOS_DE_SEGMENTO[codigo] ?? codigo;
}

/** Ordem do colégio primeiro; sem ordem, por nome. */
export function ordenarCursos<T extends ParaRotulo & { ordem?: number | null }>(
  cursos: T[],
): T[] {
  return [...cursos].sort((a, b) => {
    if (a.ordem != null && b.ordem != null) return a.ordem - b.ordem;
    if (a.ordem != null) return -1;
    if (b.ordem != null) return 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

/**
 * O código a partir do nome: `Curso Livre de Redação` → `curso-livre-de-redacao`.
 *
 * Gerado, e não digitado, porque o código vira **id de documento** e é
 * referenciado por aluno, turma e boletim: um espaço ou uma barra ali
 * quebraria o caminho do documento, e um acento faria o mesmo curso ter
 * dois códigos conforme quem digitou.
 */
export function codigoDoCurso(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
