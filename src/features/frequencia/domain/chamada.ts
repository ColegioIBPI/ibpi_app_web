import type {
  FrequenciaDiaria,
  SituacaoDePresenca,
  TipoDeOcorrencia,
} from "@/core/modelo";
import type { ParaPublicacao } from "@/features/frequencia/domain/publicacao";

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
  /**
   * Autorização de publicação da ocorrência. Só tem efeito quando há
   * ocorrência: sem ela não há o que publicar.
   *
   * O responsável nasce marcado — é o que já acontecia antes de o campo
   * existir, e desmarcá-lo é o ato deliberado de **reter** o registro
   * delicado. O aluno nasce desmarcado: ocorrência disciplinar se trata
   * com o adulto, e mostrá-la a ele é decisão caso a caso.
   */
  visivelParaResponsavel: boolean;
  visivelParaAluno: boolean;
  /** `true` quando já existia lançamento gravado para este dia. */
  jaLancado: boolean;
}

/**
 * O lançamento do dia, somado à autorização de publicação da ocorrência.
 *
 * A autorização mora no documento da **ocorrência**, não no da frequência;
 * quem carrega a tela junta os dois antes de chamar esta função, para que
 * ela continue pura.
 */
export type LancamentoDaChamada = Partial<FrequenciaDiaria> &
  Partial<ParaPublicacao>;

export function montarChamada(
  alunos: readonly AlunoDaChamada[],
  lancamentos: readonly LancamentoDaChamada[],
): LinhaDaChamada[] {
  const porMatricula = new Map(
    lancamentos
      .filter((item): item is LancamentoDaChamada & { matricula: string } =>
        Boolean(item.matricula),
      )
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
      // Os padrões são os mesmos de `domain/publicacao.ts`: ausente é
      // "como era antes do campo existir".
      visivelParaResponsavel: lancado?.visivelParaResponsavel !== false,
      visivelParaAluno: lancado?.visivelParaAluno === true,
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
    saidasAntecipadas: linhas.filter((l) => l.situacao === "saida-antecipada")
      .length,
    ocorrencias: linhas.filter((l) => l.ocorrencia !== null).length,
  };
}

/**
 * O ciclo do botão de situação, que a secretaria avança no clique.
 *
 * A saída antecipada entra **no fim**, depois do atraso: ela é a marcação
 * mais rara do dia, e pô-la antes faria a secretaria passar por ela toda
 * vez que quisesse voltar a "presente".
 */
export const PROXIMA_SITUACAO: Record<SituacaoDePresenca, SituacaoDePresenca> =
  {
    presente: "falta",
    falta: "atraso",
    atraso: "saida-antecipada",
    "saida-antecipada": "presente",
  };
