import "server-only";

import type { SessionUser } from "@/core/auth/session";
import {
  aulasLetivas,
  faltasNaDisciplina,
  percentualNaDisciplina,
} from "@/core/escola/aulas";
import {
  aba,
  montarLivro,
  type Coluna,
  type Folha,
} from "@/core/exportacao/planilha";
import { formatShortDate } from "@/core/lib/format";
import type { Aula, Trimestre } from "@/core/modelo";
import { listarAlunosVisiveis } from "@/features/alunos/services/alunos.server";
import { obterDiario } from "@/features/diario/services/diario.server";

/**
 * A pauta: a chamada de uma turma numa disciplina, aula a aula.
 *
 * É o diário de classe do professor em planilha — o mesmo documento que o
 * colégio chama de "pauta de conteúdo" e hoje imprime do Access. Duas
 * abas, porque são duas folhas no papel: a **chamada**, com os alunos nas
 * linhas e as aulas nas colunas, e o **conteúdo**, com o que foi dado em
 * cada aula.
 *
 * **Uma pauta é sempre de uma turma e uma disciplina** — é o que a
 * alocação já define. "Por curso" é o filtro que leva à alocação, não uma
 * terceira dimensão da planilha.
 */

interface LinhaDaChamada {
  sequencial: number;
  matricula: string;
  nome: string;
  /** número da aula → `P`, `F` ou vazio quando não houve aula. */
  marcas: Record<number, string>;
  faltas: number;
  percentual: number | null;
}

interface LinhaDeConteudo {
  numero: number;
  data: string;
  conteudo: string | null;
  semAula: string | null;
}

const ROTULOS_SEM_AULA: Record<string, string> = {
  ferias: "Férias",
  recesso: "Recesso",
  ponte: "Ponte",
  feriado: "Feriado",
};

/**
 * `null` quando a pessoa não alcança aquela alocação — o professor só
 * exporta a pauta das turmas e disciplinas dele, como no diário.
 */
export async function pautaDaDisciplina(
  sessao: SessionUser,
  alocacaoId: string,
  trimestre: Trimestre,
): Promise<{ arquivo: Buffer; nome: string } | null> {
  const contexto = await obterDiario(sessao, alocacaoId, trimestre);
  if (!contexto) return null;

  const { alocacao, diario } = contexto;
  const aulas = diario?.aulas ?? [];

  const alunos = (await listarAlunosVisiveis(sessao))
    .filter((aluno) => aluno.turmaId === alocacao.turmaId && aluno.ativo)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const chamada: LinhaDaChamada[] = alunos.map((aluno, indice) => ({
    sequencial: indice + 1,
    matricula: aluno.matricula,
    nome: aluno.nome,
    marcas: Object.fromEntries(
      aulas.map((aula) => [aula.numero, marcaDe(aula, aluno.matricula)]),
    ),
    faltas: faltasNaDisciplina(aulas, aluno.matricula),
    percentual: percentualNaDisciplina(aulas, aluno.matricula),
  }));

  const conteudo: LinhaDeConteudo[] = aulas.map((aula) => ({
    numero: aula.numero,
    data: aula.data,
    conteudo: aula.conteudo ?? null,
    semAula: aula.semAula ? (ROTULOS_SEM_AULA[aula.semAula] ?? aula.semAula) : null,
  }));

  const turma = alocacao.turmaCodigo ?? alocacao.turmaId;
  const disciplina = alocacao.disciplinaNome ?? alocacao.disciplinaId;

  return {
    arquivo: await montarLivro(
      abaDaChamada(aulas, chamada),
      aba({
        aba: "Conteúdo",
        colunas: COLUNAS_DE_CONTEUDO,
        linhas: conteudo,
      }),
    ),
    nome: `pauta-${turma}-${disciplina}-t${trimestre}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      // Sem traço sobrando na ponta: disciplina como "Português/Literatura"
      // deixa um no fim, e o arquivo sai `pauta-ef6a-...-.xlsx`.
      .replace(/^-+|-+$/g, ""),
  };
}

/**
 * `P`, `F` ou vazio.
 *
 * Dia sem aula fica **em branco**, e não como falta: férias e feriado não
 * são ausência do aluno, e marcá-los como `F` inflaria a contagem que
 * decide reprovação.
 *
 * Aula letiva sem marcação também fica em branco — é chamada que o
 * professor ainda não fez, e um `P` presumido afirmaria uma presença que
 * ninguém conferiu.
 */
function marcaDe(aula: Aula, matricula: string): string {
  if (aula.semAula) return "";

  const presenca = aula.presencas?.[matricula];
  if (presenca === true) return "P";
  if (presenca === false) return "F";

  return "";
}

function abaDaChamada(aulas: Aula[], linhas: LinhaDaChamada[]): Folha {
  const colunas: Coluna<LinhaDaChamada>[] = [
    { titulo: "Nº", tipo: "numero", largura: 6, valor: (l) => l.sequencial },
    { titulo: "Matrícula", tipo: "texto", largura: 12, valor: (l) => l.matricula },
    { titulo: "Aluno", tipo: "texto", largura: 38, valor: (l) => l.nome },

    /*
     * Uma coluna por aula, estreita e com o número junto da data. Só a data
     * não bastaria: a pauta é citada por número de aula ("faltou na 7"), e
     * só o número não diria quando foi.
     */
    ...aulas.map(
      (aula): Coluna<LinhaDaChamada> => ({
        titulo: `${aula.numero} · ${formatShortDate(aula.data)}`,
        tipo: "texto",
        largura: 9,
        valor: (l) => l.marcas[aula.numero] ?? "",
      }),
    ),

    { titulo: "Faltas", tipo: "numero", largura: 10, valor: (l) => l.faltas },
    {
      titulo: "Frequência",
      tipo: "texto",
      largura: 12,
      valor: (l) =>
        l.percentual === null ? null : `${Math.round(l.percentual * 100)}%`,
    },
  ];

  return aba({ aba: "Chamada", colunas, linhas });
}

const COLUNAS_DE_CONTEUDO: Coluna<LinhaDeConteudo>[] = [
  { titulo: "Aula", tipo: "numero", largura: 8, valor: (l) => l.numero },
  { titulo: "Data", tipo: "data", largura: 14, valor: (l) => l.data },
  {
    titulo: "Conteúdo",
    tipo: "texto",
    largura: 70,
    // Dia sem aula ocupa a coluna de conteúdo com o motivo: a pauta
    // impressa faz o mesmo, e uma linha em branco no meio da sequência
    // parece aula que o professor esqueceu de preencher.
    valor: (l) => l.semAula ?? l.conteudo,
  },
  {
    titulo: "Letiva",
    tipo: "texto",
    largura: 10,
    valor: (l) => (l.semAula ? "Não" : "Sim"),
  },
];

/** Quantas aulas contam para a frequência — usado no cabeçalho da tela. */
export function aulasQueContam(aulas: readonly Aula[]): number {
  return aulasLetivas(aulas).length;
}
