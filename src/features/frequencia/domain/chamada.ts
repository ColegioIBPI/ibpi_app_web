import type {
  FrequenciaDiaria,
  SituacaoDePresenca,
  TipoDeOcorrencia,
} from "@/core/modelo";

/**
 * Montagem da chamada do dia.
 *
 * A tela mostra a turma inteira com o que já foi lançado; o que ainda não
 * foi vem como presente, que é o caso da esmagadora maioria. A secretaria
 * então só marca as exceções — é assim que a planilha é preenchida hoje, e
 * exigir um clique por aluno presente tornaria a chamada mais lenta que o
 * papel.
 */

export interface AlunoDaChamada {
  matricula: string;
  nome: string;
}

export interface LinhaDaChamada {
  matricula: string;
  nome: string;
  situacao: SituacaoDePresenca;
  ocorrencia: TipoDeOcorrencia | null;
  observacao: string;
  /** `true` quando já existia lançamento gravado para este dia. */
  jaLancado: boolean;
}

export function montarChamada(
  alunos: readonly AlunoDaChamada[],
  lancamentos: readonly Partial<FrequenciaDiaria>[],
): LinhaDaChamada[] {
  const porMatricula = new Map(
    lancamentos
      .filter((item): item is FrequenciaDiaria => Boolean(item.matricula))
      .map((item) => [item.matricula, item]),
  );

  return alunos.map((aluno) => {
    const lancado = porMatricula.get(aluno.matricula);

    return {
      matricula: aluno.matricula,
      nome: aluno.nome,
      situacao: lancado?.situacao ?? "presente",
      ocorrencia: lancado?.ocorrencia ?? null,
      observacao: lancado?.observacao ?? "",
      jaLancado: Boolean(lancado),
    };
  });
}

/**
 * Id determinístico do lançamento: um por aluno por dia.
 *
 * Refazer a chamada do mesmo dia corrige o registro em vez de criar um
 * segundo — a secretaria reabre a tela o tempo todo para ajustar quem
 * chegou atrasado.
 */
export function idDoLancamento(data: string, matricula: string): string {
  return `${data}-${matricula}`;
}

/**
 * O que precisa ser gravado.
 *
 * Só as linhas que mudaram: gravar a turma inteira a cada salvamento
 * encheria a auditoria de "presente → presente" e escondeira a correção que
 * de fato aconteceu.
 */
export function linhasParaGravar(
  atuais: readonly LinhaDaChamada[],
  originais: readonly LinhaDaChamada[],
): LinhaDaChamada[] {
  const porMatricula = new Map(
    originais.map((linha) => [linha.matricula, linha]),
  );

  return atuais.filter((linha) => {
    const original = porMatricula.get(linha.matricula);

    // Aluno sem lançamento anterior só entra se não estiver no padrão —
    // marcar a turma inteira como presente criaria 73 documentos por dia
    // sem informação nenhuma.
    if (!original || !original.jaLancado) {
      return (
        linha.situacao !== "presente" ||
        linha.ocorrencia !== null ||
        linha.observacao.trim() !== ""
      );
    }

    return (
      linha.situacao !== original.situacao ||
      linha.ocorrencia !== original.ocorrencia ||
      linha.observacao.trim() !== original.observacao.trim()
    );
  });
}

/** Resumo do dia, para o cabeçalho da tela. */
export function resumoDaChamada(linhas: readonly LinhaDaChamada[]) {
  return {
    total: linhas.length,
    presentes: linhas.filter((l) => l.situacao === "presente").length,
    faltas: linhas.filter((l) => l.situacao === "falta").length,
    atrasos: linhas.filter((l) => l.situacao === "atraso").length,
    ocorrencias: linhas.filter((l) => l.ocorrencia !== null).length,
  };
}

/** Códigos da planilha, para a digitação rápida por teclado. */
export const PROXIMA_SITUACAO: Record<SituacaoDePresenca, SituacaoDePresenca> =
  {
    presente: "falta",
    falta: "atraso",
    atraso: "presente",
  };
