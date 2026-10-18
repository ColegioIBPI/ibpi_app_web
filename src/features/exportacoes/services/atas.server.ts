import "server-only";

import type { SessionUser } from "@/core/auth/session";
import { montarPlanilha, type Coluna } from "@/core/exportacao/planilha";
import {
  ROTULOS_DE_SITUACAO_DA_MATRICULA,
  ROTULOS_DE_TURNO,
} from "@/core/modelo";
import {
  dataDoStatus,
  ehMatriculaAtiva,
} from "@/features/alunos/domain/situacao";
import {
  listarAlunosVisiveis,
  type AlunoComId,
} from "@/features/alunos/services/alunos.server";
import { rotuloDoCurso } from "@/features/cursos/domain/curso";
import { listarCursos } from "@/features/cursos/services/cursos.server";

/**
 * As atas de alunos.
 *
 * Documento de secretaria: a mesma lista que hoje sai do Access, com o
 * **número sequencial** na primeira coluna. Ele não é dado do aluno — é a
 * posição na ata, e existe porque é por ele que as linhas são citadas na
 * conferência ("o nº 14 está com a data errada").
 */

interface LinhaDaAta {
  sequencial: number;
  aluno: AlunoComId;
  cursoRotulo: string;
}

function colunasDaAta(
  extras: Coluna<LinhaDaAta>[] = [],
): Coluna<LinhaDaAta>[] {
  return [
    { titulo: "Nº", tipo: "numero", largura: 6, valor: (l) => l.sequencial },
    {
      titulo: "Matrícula",
      tipo: "texto",
      largura: 12,
      valor: (l) => l.aluno.matricula,
    },
    {
      titulo: "Data de matrícula",
      tipo: "data",
      largura: 18,
      valor: (l) => l.aluno.dataMatricula ?? null,
    },
    { titulo: "Aluno", tipo: "texto", largura: 38, valor: (l) => l.aluno.nome },
    {
      titulo: "Nascimento",
      tipo: "data",
      largura: 14,
      valor: (l) => l.aluno.dataNascimento ?? null,
    },
    { titulo: "Curso", tipo: "texto", largura: 22, valor: (l) => l.cursoRotulo },
    { titulo: "Série", tipo: "texto", largura: 10, valor: (l) => l.aluno.serie ?? null },
    {
      titulo: "Turno",
      tipo: "texto",
      valor: (l) => (l.aluno.turno ? ROTULOS_DE_TURNO[l.aluno.turno] : null),
    },
    ...extras,
  ];
}

async function montarLinhas(
  alunos: AlunoComId[],
): Promise<LinhaDaAta[]> {
  const cursos = await listarCursos();

  return alunos
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((aluno, indice) => ({
      sequencial: indice + 1,
      aluno,
      cursoRotulo: rotuloDoCurso(aluno.segmento, cursos),
    }));
}

/**
 * Ata de matrículas — **todos**, qualquer que seja a situação.
 *
 * É a lista completa do ano, com a situação de cada um. Por isso traz duas
 * colunas que a ata de ativos não tem.
 */
export async function ataDeMatriculas(
  sessao: SessionUser,
  filtro: { turma?: string } = {},
): Promise<Buffer> {
  const alunos = (await listarAlunosVisiveis(sessao)).filter(
    (aluno) => !filtro.turma || aluno.turmaCodigo === filtro.turma,
  );

  return montarPlanilha({
    aba: "Matrículas",
    colunas: colunasDaAta([
      {
        titulo: "Status",
        tipo: "texto",
        largura: 16,
        valor: (l) =>
          ROTULOS_DE_SITUACAO_DA_MATRICULA[l.aluno.situacaoMatricula],
      },
      {
        titulo: "Data do status",
        tipo: "data",
        largura: 16,
        // Em branco para quem está ativo, como o colégio pediu — a regra
        // mora em `domain/situacao.ts`, com teste.
        valor: (l) => dataDoStatus(l.aluno),
      },
    ]),
    linhas: await montarLinhas(alunos),
  });
}

/**
 * Ata de alunos ativos.
 *
 * Sem colunas de situação: todos nela têm a mesma, e uma coluna que repete
 * "Ativa" em todas as linhas só ocupa largura.
 */
export async function ataDeAlunosAtivos(
  sessao: SessionUser,
  filtro: { turma?: string } = {},
): Promise<Buffer> {
  const alunos = (await listarAlunosVisiveis(sessao))
    .filter((aluno) => ehMatriculaAtiva(aluno.situacaoMatricula))
    .filter((aluno) => !filtro.turma || aluno.turmaCodigo === filtro.turma);

  return montarPlanilha({
    aba: "Alunos ativos",
    colunas: colunasDaAta(),
    linhas: await montarLinhas(alunos),
  });
}

/**
 * Ata de alunos cancelados.
 *
 * Filtra pela situação **`cancelada`**, e não por "tudo que não está
 * ativo": o colégio tem cinco situações, e juntar transferido e concluído
 * numa ata chamada "cancelados" faria o documento afirmar o que não é. As
 * outras situações merecem atas próprias quando forem pedidas.
 *
 * A **data de cancelamento** é `dataDaSituacao`, que é gravada justamente
 * quando a matrícula deixa de ser ativa.
 */
export async function ataDeAlunosCancelados(
  sessao: SessionUser,
  filtro: { turma?: string } = {},
): Promise<Buffer> {
  const alunos = (await listarAlunosVisiveis(sessao))
    .filter((aluno) => aluno.situacaoMatricula === "cancelada")
    .filter((aluno) => !filtro.turma || aluno.turmaCodigo === filtro.turma);

  return montarPlanilha({
    aba: "Alunos cancelados",
    colunas: colunasDaAta([
      {
        titulo: "Data de cancelamento",
        tipo: "data",
        largura: 20,
        valor: (l) => l.aluno.dataDaSituacao ?? null,
      },
    ]),
    linhas: await montarLinhas(alunos),
  });
}
