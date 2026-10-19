import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { exigirPermissao } from "@/core/auth/guards";
import {
  ROTULOS_DE_SITUACAO_DA_MATRICULA,
  situacaoDaMatriculaSchema,
} from "@/core/modelo";
import { Card } from "@/core/ui/card";
import { MudancaDeSituacao } from "@/features/alunos/components/mudanca-de-situacao";
import { ordenarPorNome, turmasDaLista } from "@/features/alunos/domain/busca";
import { listarAlunosVisiveis } from "@/features/alunos/services/alunos.server";

export const metadata: Metadata = { title: "Situação das matrículas" };

/**
 * Mudança de situação em lote.
 *
 * Tela própria, e não um modo da lista de alunos: a lista é usada o dia
 * inteiro para consultar, e caixas de seleção que encerram matrícula
 * convivendo com a busca do telefone é convite ao clique errado.
 */
export default async function SituacaoDasMatriculasPage({
  searchParams,
}: PageProps<"/gestao/alunos/situacao">) {
  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const filtros = await searchParams;

  const turma = typeof filtros.turma === "string" ? filtros.turma : undefined;
  const termo = typeof filtros.q === "string" ? filtros.q : undefined;

  // A situação a listar é um filtro próprio: quem vai marcar concluídos
  // parte dos ativos, e quem vai corrigir um engano parte dos concluídos.
  const situacao =
    typeof filtros.situacao === "string" &&
    situacaoDaMatriculaSchema.safeParse(filtros.situacao).success
      ? (filtros.situacao as (typeof situacaoDaMatriculaSchema.options)[number])
      : "ativa";

  const todos = await listarAlunosVisiveis(sessao);

  const encontrados = ordenarPorNome(
    todos
      .filter((aluno) => aluno.situacaoMatricula === situacao)
      .filter((aluno) => !turma || aluno.turmaCodigo === turma)
      .filter(
        (aluno) =>
          !termo ||
          aluno.nome.toLowerCase().includes(termo.toLowerCase()) ||
          aluno.matricula.includes(termo),
      ),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/alunos"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Alunos
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">
          Situação das matrículas
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          Marcar concluídos, transferidos ou cancelados em lote. É a situação
          que alimenta as atas e a ficha do aluno.
        </p>
      </div>

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-ink text-sm font-medium">Listar quem está</span>
            <select
              name="situacao"
              defaultValue={situacao}
              className="border-line bg-surface text-ink h-10 rounded-md border px-3 text-sm"
            >
              {situacaoDaMatriculaSchema.options.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {ROTULOS_DE_SITUACAO_DA_MATRICULA[opcao]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-ink text-sm font-medium">Turma</span>
            <select
              name="turma"
              defaultValue={turma ?? ""}
              className="border-line bg-surface text-ink h-10 rounded-md border px-3 text-sm"
            >
              <option value="">Todas</option>
              {turmasDaLista(todos).map((codigo) => (
                <option key={codigo} value={codigo}>
                  {codigo}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="border-line bg-surface text-ink hover:bg-surface-subtle h-10 rounded-md border px-4 text-sm font-medium"
          >
            Filtrar
          </button>
        </form>
      </Card>

      <Card>
        <Suspense>
          <MudancaDeSituacao
            alunos={encontrados.map((aluno) => ({
              matricula: aluno.matricula,
              nome: aluno.nome,
              turmaCodigo: aluno.turmaCodigo ?? null,
              serie: aluno.serie ?? null,
              situacaoMatricula: aluno.situacaoMatricula,
            }))}
          />
        </Suspense>
      </Card>
    </div>
  );
}
