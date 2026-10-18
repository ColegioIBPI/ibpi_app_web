import type { SituacaoDaMatricula } from "@/core/modelo";

/**
 * Situação da matrícula e a data que a acompanha.
 *
 * Duas regras que parecem detalhe e não são:
 *
 * - **`ativo` não se edita.** Ele existe porque metade do sistema consulta
 *   `where("ativo", "==", true)`, e deriva da situação. Guardar os dois
 *   independentes é como um aluno transferido continua aparecendo na
 *   chamada do professor.
 * - **A data da situação só é outra data quando a matrícula não está
 *   ativa.** Com matrícula ativa ela é a própria data de matrícula; pedir
 *   para a secretaria digitar a mesma data duas vezes é pedir para as duas
 *   divergirem.
 */

export function ehMatriculaAtiva(situacao: SituacaoDaMatricula): boolean {
  return situacao === "ativa";
}

/** A situação encerra a matrícula, e por isso exige a data do fato. */
export function exigeDataPropria(situacao: SituacaoDaMatricula): boolean {
  return !ehMatriculaAtiva(situacao);
}

export interface DadosDaSituacao {
  situacaoMatricula: SituacaoDaMatricula;
  dataDaSituacao?: string | null;
  dataMatricula?: string | null;
}

/**
 * A data que vale para esta situação.
 *
 * Matrícula ativa: a data de matrícula, sempre — mesmo que o formulário
 * tenha mandado outra coisa, porque "ativo desde outro dia" não significa
 * nada. Encerrada: a data informada, e `null` quando ninguém informou, o
 * que a tela mostra como pendência em vez de inventar hoje.
 */
export function dataQueVale(dados: DadosDaSituacao): string | null {
  return ehMatriculaAtiva(dados.situacaoMatricula)
    ? (dados.dataMatricula ?? null)
    : (dados.dataDaSituacao ?? null);
}

/**
 * A data do status, **só quando o status não é "ativa"**.
 *
 * É o que a ata de matrículas pede. Para quem está ativo a coluna fica em
 * branco: a data da matrícula já está na coluna ao lado, e repeti-la aqui
 * faria parecer que todo aluno teve uma mudança de situação.
 *
 * Não se confunde com `dataQueVale`, que escolhe **uma** data para mostrar
 * — matrícula para o ativo, situação para o resto. Aqui a pergunta é
 * outra: "quando mudou?", e para o ativo a resposta é "não mudou".
 */
export function dataDoStatus(dados: DadosDaSituacao): string | null {
  return ehMatriculaAtiva(dados.situacaoMatricula)
    ? null
    : (dados.dataDaSituacao ?? null);
}

export interface SituacaoNormalizada {
  ativo: boolean;
  situacaoMatricula: SituacaoDaMatricula;
  dataDaSituacao: string | null;
}

/** O que vai para o banco, com `ativo` e a data já acertados. */
export function normalizarSituacao(
  dados: DadosDaSituacao,
): SituacaoNormalizada {
  return {
    ativo: ehMatriculaAtiva(dados.situacaoMatricula),
    situacaoMatricula: dados.situacaoMatricula,
    dataDaSituacao: dataQueVale(dados),
  };
}

/**
 * A situação de um cadastro que veio do Access.
 *
 * Lá só havia `ativo` e um texto livre. Um ex-aluno vira `cancelada`, e não
 * `transferida` ou `abandono`: entre os três, cancelada é a que afirma
 * menos — dizer que alguém abandonou a escola sem ter esse registro seria
 * inventar um fato sobre uma pessoa.
 */
export function situacaoDoMigrado(ativo: boolean): SituacaoDaMatricula {
  return ativo ? "ativa" : "cancelada";
}
