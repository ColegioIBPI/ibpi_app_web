import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { alocacoesVisiveis } from "@/core/escola/alocacoes.server";
import { trimestreDaQuery } from "@/core/lib/ano-letivo";
import { Card } from "@/core/ui/card";
import { SeletorDeTrimestre } from "@/core/ui/seletor-de-trimestre";
import { EmptyState } from "@/core/ui/states";

export const metadata: Metadata = { title: "Notas" };

export default async function NotasPage({
  searchParams,
}: PageProps<"/gestao/notas">) {
  const sessao = await exigirPermissao("notas", "lancar");
  const filtros = await searchParams;
  const trimestre = trimestreDaQuery(filtros.trimestre);

  const alocacoes = await alocacoesVisiveis(sessao);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Notas</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Projeto, Tarefas e AV por aluno. A média do trimestre é
          {" "}(Projeto + Tarefas + AV) ÷ 3.
        </p>
      </div>

      <SeletorDeTrimestre atual={trimestre} />

      <Card>
        {alocacoes.length === 0 ? (
          <EmptyState
            title="Nenhuma disciplina alocada"
            description={
              sessao.role === "professor"
                ? "A secretaria ainda não alocou você em nenhuma turma e disciplina."
                : "Cadastre alocações de professor × turma × disciplina para lançar notas."
            }
          />
        ) : (
          <ul className="divide-line divide-y">
            {alocacoes.map((alocacao) => (
              <li key={alocacao.id}>
                <Link
                  href={`/gestao/notas/${alocacao.id}?trimestre=${trimestre}`}
                  className="hover:bg-surface-subtle -mx-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded px-2 py-3"
                >
                  <span className="text-brand-600 font-medium">
                    {alocacao.disciplinaNome ?? alocacao.disciplinaId}
                  </span>
                  <span className="text-ink text-sm">
                    Turma {alocacao.turmaCodigo ?? alocacao.turmaId}
                  </span>
                  <span className="text-ink-muted text-sm">
                    {alocacao.professorNome ?? "Professor não informado"} ·{" "}
                    {alocacao.anoLetivo}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
