import type { Metadata } from "next";
import { Suspense } from "react";

import { exigirPermissao } from "@/core/auth/guards";
import { Card } from "@/core/ui/card";
import { LoadingState } from "@/core/ui/states";
import { FiltrosDeAlunos } from "@/features/alunos/components/filtros-de-alunos";
import { TabelaDeAlunos } from "@/features/alunos/components/tabela-de-alunos";
import {
  filtrarAlunos,
  ordenarPorNome,
  turmasDaLista,
} from "@/features/alunos/domain/busca";
import { listarAlunosVisiveis } from "@/features/alunos/services/alunos.server";

export const metadata: Metadata = { title: "Alunos" };

export default async function AlunosPage({
  searchParams,
}: PageProps<"/gestao/alunos">) {
  const sessao = await exigirPermissao("cadastros", "ler");
  const filtros = await searchParams;

  const todos = await listarAlunosVisiveis(sessao);

  const filtro = {
    termo: texto(filtros.q),
    turma: texto(filtros.turma),
    situacao: situacao(filtros.situacao),
  };

  const encontrados = ordenarPorNome(filtrarAlunos(todos, filtro));
  const temFiltro = Boolean(filtro.termo || filtro.turma);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Alunos</h1>
        <p className="text-ink-muted mt-1 text-sm">
          {encontrados.length === todos.length
            ? `${todos.length} ${todos.length === 1 ? "aluno" : "alunos"}`
            : `${encontrados.length} de ${todos.length}`}
        </p>
      </div>

      <Card>
        <Suspense fallback={<LoadingState title="Carregando filtros…" />}>
          <FiltrosDeAlunos turmas={turmasDaLista(todos)} />
        </Suspense>

        <div className="mt-6">
          <TabelaDeAlunos alunos={encontrados} filtrada={temFiltro} />
        </div>
      </Card>
    </div>
  );
}

function texto(valor: string | string[] | undefined): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor : undefined;
}

function situacao(
  valor: string | string[] | undefined,
): "ativos" | "inativos" | "todos" {
  return valor === "inativos" || valor === "todos" ? valor : "ativos";
}
