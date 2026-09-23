import type {
  AvaliacoesDoTrimestre,
  Dependencia,
  LinhaDoBoletim,
  Nota,
  SituacaoFinal,
  Trimestre,
} from "@/core/modelo";
import {
  calcularDependencia,
  calcularLinha,
  situacaoDoAno,
} from "@/features/notas/domain/calculo";

/**
 * Montagem do boletim.
 *
 * As linhas das disciplinas são **calculadas a partir das notas**, não lidas
 * de um consolidado gravado. Guardar o boletim pronto significaria que
 * corrigir uma nota deixa o boletim velho no banco até alguém lembrar de
 * recalcular — e o boletim errado é justamente o que chega à família.
 *
 * O que não é derivável (recuperação, eletivas, dependências, Projeto
 * Bilíngue, observações) vem do documento do boletim.
 */

export interface BoletimMontado {
  disciplinas: LinhaDoBoletim[];
  faltasPorTrimestre: Record<string, number>;
  situacao: SituacaoFinal;
  dependencias: Dependencia[];
}

export interface EntradaDoBoletim {
  notas: readonly Nota[];
  recuperacoes: Readonly<Record<string, number | null>>;
  dependencias: readonly Dependencia[];
  /** Frequência geral do aluno no ano, de 0 a 1. */
  percentualDeFrequencia: number | null;
}

export function montarBoletim({
  notas,
  recuperacoes,
  dependencias,
  percentualDeFrequencia,
}: EntradaDoBoletim): BoletimMontado {
  const disciplinas = montarLinhas(
    notas,
    recuperacoes,
    percentualDeFrequencia,
  );

  const calculadas = dependencias.map((dependencia) => ({
    ...dependencia,
    ...calcularDependencia(dependencia),
  }));

  return {
    disciplinas,
    faltasPorTrimestre: somarFaltasPorTrimestre(notas),
    // A dependência é de um ano anterior e não decide o ano corrente: ela
    // aparece no boletim como pendência, à parte da situação do ano.
    situacao: situacaoDoAno(disciplinas.map((linha) => linha.situacao)),
    dependencias: calculadas,
  };
}

/** Uma linha por disciplina, com os três trimestres e o fechamento. */
export function montarLinhas(
  notas: readonly Nota[],
  recuperacoes: Readonly<Record<string, number | null>>,
  percentualDeFrequencia: number | null,
): LinhaDoBoletim[] {
  const porDisciplina = new Map<
    string,
    { nome: string; trimestres: Record<string, AvaliacoesDoTrimestre>; faltas: number }
  >();

  for (const nota of notas) {
    const atual = porDisciplina.get(nota.disciplinaId) ?? {
      nome: nota.disciplinaNome ?? nota.disciplinaId,
      trimestres: {},
      faltas: 0,
    };

    atual.trimestres[String(nota.trimestre)] = nota.avaliacoes;
    atual.faltas += nota.faltas ?? 0;

    porDisciplina.set(nota.disciplinaId, atual);
  }

  return [...porDisciplina.entries()]
    .map(([disciplinaId, dados]) => {
      const recuperacao = recuperacoes[disciplinaId] ?? null;
      const calculada = calcularLinha(
        dados.trimestres,
        recuperacao,
        percentualDeFrequencia,
      );

      return {
        disciplinaId,
        disciplinaNome: dados.nome,
        trimestres: dados.trimestres,
        faltas: dados.faltas,
        recuperacao,
        ...calculada,
      };
    })
    .sort((a, b) => a.disciplinaNome.localeCompare(b.disciplinaNome, "pt-BR"));
}

/**
 * Faltas por trimestre, somadas das disciplinas.
 *
 * É o bloco de fechamento do boletim impresso. Não é a frequência geral do
 * aluno — essa vem do registro diário da secretaria, que conta dias, não
 * aulas.
 */
export function somarFaltasPorTrimestre(
  notas: readonly Nota[],
): Record<string, number> {
  const total: Record<string, number> = { "1": 0, "2": 0, "3": 0 };

  for (const nota of notas) {
    const chave = String(nota.trimestre);
    total[chave] = (total[chave] ?? 0) + (nota.faltas ?? 0);
  }

  return total;
}

/** Disciplinas que vão para a recuperação final, para a secretaria convocar. */
export function disciplinasEmRecuperacao(
  disciplinas: readonly LinhaDoBoletim[],
): LinhaDoBoletim[] {
  return disciplinas.filter((linha) => linha.situacao === "recuperacao");
}

/** Trimestres com alguma nota lançada, para a tela saber o que já existe. */
export function trimestresLancados(notas: readonly Nota[]): Trimestre[] {
  const presentes = new Set(notas.map((nota) => nota.trimestre));

  return ([1, 2, 3] as Trimestre[]).filter((t) => presentes.has(t));
}
