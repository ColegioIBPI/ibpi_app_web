import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { trimestreDaQuery } from "@/core/lib/ano-letivo";
import { Card } from "@/core/ui/card";
import { SeletorDeTrimestre } from "@/core/ui/seletor-de-trimestre";
import { EmptyState } from "@/core/ui/states";
import { GradeDeNotas } from "@/features/notas/components/grade-de-notas";
import { montarLancamento } from "@/features/notas/domain/lancamento";
import { contextoDeLancamento } from "@/features/notas/services/notas.server";

export const metadata: Metadata = { title: "Lançamento de notas" };

export default async function LancamentoDeNotasPage({
  params,
  searchParams,
}: PageProps<"/gestao/notas/[id]">) {
  const sessao = await exigirPermissao("notas", "lancar");
  const { id } = await params;
  const filtros = await searchParams;
  const trimestre = trimestreDaQuery(filtros.trimestre);

  // Disciplina de outro professor responde 404, e não 403 — dizer "existe,
  // mas não é sua" já entregaria que a turma tem aquela disciplina.
  const contexto = await contextoDeLancamento(sessao, id, trimestre);
  if (!contexto) notFound();

  const { alocacao, alunos, notas, faltasDoDiario } = contexto;

  // Quem ainda não tem lançamento começa com as faltas contadas no diário —
  // o professor confere em vez de recontar.
  const linhas = montarLancamento(alunos, notas).map((linha) =>
    linha.jaLancado
      ? linha
      : { ...linha, faltas: faltasDoDiario[linha.matricula] ?? 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/notas"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Notas
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">
          {alocacao.disciplinaNome ?? alocacao.disciplinaId} ·{" "}
          {alocacao.turmaCodigo ?? alocacao.turmaId}
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          {alocacao.professorNome ?? "Professor não informado"} ·{" "}
          {alocacao.anoLetivo} · {trimestre}º trimestre
        </p>
      </div>

      <SeletorDeTrimestre atual={trimestre} />

      <Card>
        {alunos.length === 0 ? (
          <EmptyState
            title="Nenhum aluno nesta turma"
            description="Matricule alunos na turma para lançar notas."
          />
        ) : (
          <GradeDeNotas
            // Sem a `key`, trocar de trimestre mantinha na tela as notas do
            // anterior — e salvar gravaria aquelas notas no trimestre novo.
            key={`${id}-${trimestre}`}
            alocacaoId={id}
            trimestre={trimestre}
            linhas={linhas}
            faltasDoDiario={faltasDoDiario}
          />
        )}
      </Card>
    </div>
  );
}
