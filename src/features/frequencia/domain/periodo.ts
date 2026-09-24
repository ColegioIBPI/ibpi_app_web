import { paraDataISO } from "@/core/lib/datas";
import type { FrequenciaDiaria, SituacaoDePresenca } from "@/core/modelo";
import { contar, percentualDePresenca, type Contadores } from "@/core/escola/frequencia";

/**
 * Consolidação da frequência de uma turma num período.
 *
 * É o relatório que a secretaria imprime e manda para a coordenação, e o
 * mesmo recorte que a planilha exporta.
 */

export interface LinhaDoPeriodo {
  matricula: string;
  nome: string;
  contadores: Contadores;
  percentual: number | null;
}

export interface AlunoDoPeriodo {
  matricula: string;
  nome: string;
}

/**
 * Uma linha por aluno da turma, inclusive quem não tem lançamento nenhum.
 *
 * Deixar de fora quem nunca faltou esconderia metade da turma do relatório —
 * e é a turma inteira que a coordenação quer ver.
 */
export function consolidarPeriodo(
  alunos: readonly AlunoDoPeriodo[],
  lancamentos: readonly FrequenciaDiaria[],
): LinhaDoPeriodo[] {
  const porMatricula = new Map<string, SituacaoDePresenca[]>();

  for (const lancamento of lancamentos) {
    const atuais = porMatricula.get(lancamento.matricula) ?? [];
    atuais.push(lancamento.situacao as SituacaoDePresenca);
    porMatricula.set(lancamento.matricula, atuais);
  }

  return alunos
    .map((aluno) => {
      const contadores = contar(porMatricula.get(aluno.matricula) ?? []);

      return {
        matricula: aluno.matricula,
        nome: aluno.nome,
        contadores,
        percentual: percentualDePresenca(contadores),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export interface Periodo {
  de: string;
  ate: string;
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Período pedido na URL, com um padrão útil.
 *
 * Sem período o relatório traria o ano letivo inteiro de toda a turma. O
 * padrão é o **mês corrente**, que é o recorte que a secretaria pede na
 * maioria das vezes.
 */
export function periodoDaQuery(
  de: unknown,
  ate: unknown,
  hoje: Date = new Date(),
): Periodo {
  const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  return {
    de: typeof de === "string" && DATA.test(de) ? de : paraDataISO(inicioDoMes),
    ate: typeof ate === "string" && DATA.test(ate) ? ate : paraDataISO(hoje),
  };
}

/** O período está de trás para frente? */
export function periodoInvertido({ de, ate }: Periodo): boolean {
  return de > ate;
}

/** Totais do rodapé do relatório. */
export function resumirPeriodo(linhas: readonly LinhaDoPeriodo[]) {
  const totais = linhas.reduce(
    (soma, linha) => ({
      presencas: soma.presencas + linha.contadores.presencas,
      faltas: soma.faltas + linha.contadores.faltas,
      atrasos: soma.atrasos + linha.contadores.atrasos,
      dias: soma.dias + linha.contadores.dias,
    }),
    { presencas: 0, faltas: 0, atrasos: 0, dias: 0 },
  );

  return {
    ...totais,
    alunos: linhas.length,
    abaixoDoMinimo: linhas.filter(
      (linha) => linha.percentual !== null && linha.percentual < 0.75,
    ).length,
    percentual: percentualDePresenca(totais),
  };
}
