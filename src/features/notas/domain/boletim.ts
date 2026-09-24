import type {
  AvaliacoesDoTrimestre,
  Dependencia,
  LinhaDoBoletim,
  Nota,
  ProjetoBilingue,
  SituacaoFinal,
  Trimestre,
} from "@/core/modelo";
import {
  arredondar,
  calcularDependencia,
  calcularLinha,
  mediaAnual,
  mediaParcial,
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

export interface DisciplinaDaGrade {
  disciplinaId: string;
  disciplinaNome: string;
  /** Posição no boletim; sem ela, a disciplina vai para o fim. */
  ordem?: number | null;
}

/**
 * Ordem do boletim: a do colégio, não a alfabética.
 *
 * A posição vem do cadastro da disciplina (`disciplinas.ordem`). Quem não
 * tem posição definida vai para o fim, em ordem de nome — assim uma
 * disciplina nova aparece no boletim em vez de sumir, e fica visível que
 * falta ordená-la.
 */
export function ordenarDisciplinas<
  T extends { ordem?: number | null; disciplinaNome: string },
>(linhas: readonly T[]): T[] {
  const FIM = Number.MAX_SAFE_INTEGER;

  return [...linhas].sort(
    (a, b) =>
      (a.ordem ?? FIM) - (b.ordem ?? FIM) ||
      a.disciplinaNome.localeCompare(b.disciplinaNome, "pt-BR"),
  );
}

export interface EntradaDoBoletim {
  notas: readonly Nota[];
  recuperacoes: Readonly<Record<string, number | null>>;
  dependencias: readonly Dependencia[];
  /** Frequência geral do aluno no ano, de 0 a 1. */
  percentualDeFrequencia: number | null;
  /**
   * Disciplinas da grade da turma, mesmo as que ainda não têm nota.
   *
   * O boletim impresso lista a grade inteira: Educação Física aparece lá com
   * as células em branco. Montar só a partir das notas faria a disciplina
   * sumir do boletim até alguém lançar a primeira nota.
   */
  grade?: readonly DisciplinaDaGrade[];
}

export function montarBoletim({
  notas,
  recuperacoes,
  dependencias,
  percentualDeFrequencia,
  grade,
}: EntradaDoBoletim): BoletimMontado {
  const disciplinas = montarLinhas(
    notas,
    recuperacoes,
    percentualDeFrequencia,
    grade,
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
  grade: readonly DisciplinaDaGrade[] = [],
): LinhaDoBoletim[] {
  const porDisciplina = new Map<
    string,
    {
      nome: string;
      ordem: number | null;
      trimestres: Record<string, AvaliacoesDoTrimestre>;
      faltas: number;
    }
  >();

  // A grade entra primeiro, para a disciplina sem nota nenhuma continuar
  // aparecendo no boletim, com as células em branco.
  for (const disciplina of grade) {
    porDisciplina.set(disciplina.disciplinaId, {
      nome: disciplina.disciplinaNome,
      ordem: disciplina.ordem ?? null,
      trimestres: {},
      faltas: 0,
    });
  }

  for (const nota of notas) {
    const atual = porDisciplina.get(nota.disciplinaId) ?? {
      nome: nota.disciplinaNome ?? nota.disciplinaId,
      ordem: null,
      trimestres: {},
      faltas: 0,
    };

    atual.trimestres[String(nota.trimestre)] = nota.avaliacoes;
    atual.faltas += nota.faltas ?? 0;

    porDisciplina.set(nota.disciplinaId, atual);
  }

  return ordenarDisciplinas(
    [...porDisciplina.entries()].map(([disciplinaId, dados]) => {
      const recuperacao = recuperacoes[disciplinaId] ?? null;
      const calculada = calcularLinha(
        dados.trimestres,
        recuperacao,
        percentualDeFrequencia,
      );

      return {
        disciplinaId,
        disciplinaNome: dados.nome,
        ordem: dados.ordem,
        trimestres: dados.trimestres,
        faltas: dados.faltas,
        recuperacao,
        ...calculada,
      };
    }),
  );
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

/**
 * Média do Projeto Bilíngue num trimestre, a partir dos três componentes.
 *
 * No boletim impresso o Projeto Bilíngue aparece **duas vezes**: como bloco
 * próprio, com STEAM, ENGLISH e PROJECT, e como uma linha da tabela
 * principal — e a nota dessa linha é a média dos três (8,25 + 9,50 + 9,50
 * dão os 9,08 que o boletim mostra).
 *
 * `null` enquanto faltar componente: o mesmo critério das outras médias.
 */
export function mediaDoBilingue(
  projeto: ProjetoBilingue | null | undefined,
  trimestre: string,
): number | null {
  const componentes = projeto?.componentes ?? [];
  if (componentes.length === 0) return null;

  const notas = componentes.map((c) => c.trimestres?.[trimestre] ?? null);
  if (notas.some((nota) => nota === null || nota === undefined)) return null;

  const soma = notas.reduce<number>((total, nota) => total + (nota ?? 0), 0);

  return arredondar(soma / notas.length);
}

/** As três médias trimestrais do Projeto Bilíngue, e a anual. */
export function linhaDoBilingue(
  projeto: ProjetoBilingue | null | undefined,
): Pick<LinhaDoBoletim, "mediasPorTrimestre" | "mediaAnual" | "mediaParcial"> {
  const mediasPorTrimestre: Record<string, number | null> = {};

  for (const trimestre of ["1", "2", "3"]) {
    mediasPorTrimestre[trimestre] = mediaDoBilingue(projeto, trimestre);
  }

  return {
    mediasPorTrimestre,
    mediaAnual: mediaAnual(mediasPorTrimestre),
    mediaParcial: mediaParcial(mediasPorTrimestre),
  };
}
