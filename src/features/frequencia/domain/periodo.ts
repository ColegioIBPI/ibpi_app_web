import { paraDataISO } from "@/core/lib/datas";
import type {
  Aula,
  DiarioDeClasse,
  FrequenciaDiaria,
  SituacaoDePresenca,
} from "@/core/modelo";
import { aulasLetivas } from "@/core/escola/aulas";
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
  /** Faltas por disciplina, contadas nos diários de classe do período. */
  porDisciplina: FaltaNaDisciplina[];
}

/**
 * Faltas de um aluno numa disciplina, no período.
 *
 * Vem do **diário do professor**, que conta aulas — não do registro diário
 * da secretaria, que conta dias. São contagens diferentes de propósito: um
 * aluno pode faltar a uma aula de Física e ter estado na escola o dia todo.
 */
export interface FaltaNaDisciplina {
  disciplinaId: string;
  disciplinaNome: string;
  /** Aulas letivas dadas no período. Dia sem aula não entra. */
  aulas: number;
  faltas: number;
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
  diarios: readonly DiarioDeClasse[] = [],
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
        porDisciplina: faltasPorDisciplina(diarios, aluno.matricula),
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

/**
 * Faltas do aluno em cada disciplina, a partir dos diários recebidos.
 *
 * Quem filtra o período é quem monta a lista de aulas — ver
 * `aulasNoPeriodo`. Aqui só se conta, para a regra de "dia sem aula não
 * entra" ficar num lugar só.
 *
 * Disciplina sem aula dada no período fica de fora: uma linha com "0 de 0"
 * não diz nada e só ocupa o relatório.
 */
export function faltasPorDisciplina(
  diarios: readonly DiarioDeClasse[],
  matricula: string,
): FaltaNaDisciplina[] {
  const porDisciplina = new Map<string, FaltaNaDisciplina>();

  for (const diario of diarios) {
    const letivas = aulasLetivas(diario.aulas ?? []);
    if (letivas.length === 0) continue;

    const atual = porDisciplina.get(diario.disciplinaId) ?? {
      disciplinaId: diario.disciplinaId,
      disciplinaNome: diario.disciplinaNome ?? diario.disciplinaId,
      aulas: 0,
      faltas: 0,
      percentual: null,
    };

    atual.aulas += letivas.length;
    atual.faltas += letivas.filter(
      (aula) => aula.presencas?.[matricula] === false,
    ).length;

    porDisciplina.set(diario.disciplinaId, atual);
  }

  return [...porDisciplina.values()]
    .map((linha) => ({
      ...linha,
      percentual:
        linha.aulas === 0 ? null : (linha.aulas - linha.faltas) / linha.aulas,
    }))
    .sort((a, b) => a.disciplinaNome.localeCompare(b.disciplinaNome, "pt-BR"));
}

/**
 * Recorta os diários ao período pedido.
 *
 * O diário é do trimestre inteiro; o relatório é de um intervalo de datas.
 * Sem o recorte, pedir a primeira semana de setembro traria as faltas do
 * trimestre todo.
 */
export function diariosNoPeriodo(
  diarios: readonly DiarioDeClasse[],
  { de, ate }: Periodo,
): DiarioDeClasse[] {
  return diarios.map((diario) => ({
    ...diario,
    aulas: (diario.aulas ?? []).filter(
      (aula: Aula) => aula.data >= de && aula.data <= ate,
    ),
  }));
}

/** Disciplinas que aparecem no recorte, para o cabeçalho da tabela. */
export function disciplinasDoPeriodo(
  linhas: readonly LinhaDoPeriodo[],
): { disciplinaId: string; disciplinaNome: string }[] {
  const vistas = new Map<string, string>();

  for (const linha of linhas) {
    for (const d of linha.porDisciplina) vistas.set(d.disciplinaId, d.disciplinaNome);
  }

  return [...vistas.entries()]
    .map(([disciplinaId, disciplinaNome]) => ({ disciplinaId, disciplinaNome }))
    .sort((a, b) => a.disciplinaNome.localeCompare(b.disciplinaNome, "pt-BR"));
}
