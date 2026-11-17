import { CURSOS_PADRAO, ROTULOS_DE_SEGMENTO, type Curso } from "@/core/modelo";

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

/**
 * Quais dos cursos do sistema ainda não estão no cadastro.
 *
 * A oferta de gravá-los dependia de o cadastro estar **vazio**, e isso tem
 * um buraco que o colégio caiu dentro: quem cria um curso próprio antes de
 * gravar os quatro perde a oferta para sempre, e fica com turmas apontando
 * para códigos que não existem no cadastro. Foi o que aconteceu — havia um
 * curso "Personalizado" e nenhum dos quatro, e o seletor de curso do
 * critério de avaliação não tinha o que oferecer.
 *
 * A pergunta certa não é "o cadastro está vazio?", e sim "falta algum dos
 * que o sistema já usa?".
 */
export function cursosPadraoFaltando<T extends Pick<Curso, "codigo">>(
  cadastrados: readonly T[],
  padrao: ReadonlyArray<Pick<Curso, "codigo" | "nome">> = CURSOS_PADRAO,
): Array<Pick<Curso, "codigo" | "nome">> {
  const existentes = new Set(cadastrados.map((curso) => curso.codigo));

  return padrao.filter((curso) => !existentes.has(curso.codigo));
}

export interface CursoDaLista extends Curso {
  id: string;
  /**
   * `false` quando o curso ainda é só o padrão do código, sem documento
   * no cadastro. A tela usa isso para travar renomear e encerrar — não há
   * o que gravar — e para oferecer a gravação.
   */
  gravado: boolean;
}

/**
 * O cadastro, somado aos cursos que o sistema já usa e que ainda não
 * foram gravados.
 *
 * **O bug que isto conserta foi relatado pela escola:** "ao criar um
 * curso Personalizado, os outros cursos sumiram da listagem". A lista
 * caía no padrão do código **só com o cadastro vazio**, tudo ou nada — e
 * o primeiro curso próprio fazia os quatro desaparecerem de uma vez, da
 * tela e de todos os seletores.
 *
 * Não era só a tela. `features/turmas/actions/salvar.ts` confere o curso
 * da turma contra esta lista, então salvar qualquer turma de Ensino
 * Médio passava a responder "o curso medio não existe no cadastro".
 *
 * Somar em vez de escolher resolve os dois: o que está gravado vale como
 * está — inclusive renomeado ou encerrado —, e o que falta aparece como
 * o sistema o conhece, até alguém gravá-lo.
 */
export function comCursosDoSistema<T extends Curso & { id: string }>(
  cadastrados: readonly T[],
  padrao: ReadonlyArray<Pick<Curso, "codigo" | "nome" | "ordem">> = CURSOS_PADRAO,
): CursoDaLista[] {
  const faltando = cursosPadraoFaltando(cadastrados, padrao).map((curso) => ({
    ...curso,
    // `ordem` vem do padrão quando existe: é ela que põe Fundamental
    // antes do Médio sem ninguém ter digitado nada.
    ordem: padrao.find((p) => p.codigo === curso.codigo)?.ordem ?? null,
    id: curso.codigo,
    sigla: null,
    ativo: true,
    origem: "portal" as const,
    gravado: false,
  }));

  return ordenarCursos([
    ...cadastrados.map((curso) => ({ ...curso, gravado: true })),
    ...faltando,
  ]);
}
