import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { trimestreDaQuery } from "@/core/lib/ano-letivo";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { GradeDeAulas } from "@/features/diario/components/grade-de-aulas";
import { SeletorDeTrimestre } from "@/core/ui/seletor-de-trimestre";
import { alunosDaTurma } from "@/core/escola/alocacoes.server";
import { obterDiario } from "@/features/diario/services/diario.server";

export const metadata: Metadata = { title: "Diário de classe" };

export default async function DiarioDaAlocacaoPage({
  params,
  searchParams,
}: PageProps<"/gestao/diario/[id]">) {
  const sessao = await exigirPermissao("frequencia", "lancar");
  const { id } = await params;
  const filtros = await searchParams;
  const trimestre = trimestreDaQuery(filtros.trimestre);

  // Diário de outro professor responde 404, e não 403: dizer "existe, mas
  // não é seu" já entregaria que aquela turma tem aquela disciplina.
  const contexto = await obterDiario(sessao, id, trimestre);
  if (!contexto) notFound();

  const { alocacao, diario } = contexto;
  const alunos = await alunosDaTurma(alocacao.turmaId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/diario"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Diários
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
            description="Matricule alunos na turma para registrar chamada."
          />
        ) : (
          <GradeDeAulas
            // Trocar de trimestre é trocar de diário: o que estava aberto e
            // o que estava sendo digitado não valem para o outro.
            key={`${id}-${trimestre}`}
            alocacaoId={id}
            trimestre={trimestre}
            aulas={diario?.aulas ?? []}
            alunos={alunos}
          />
        )}
      </Card>
    </div>
  );
}
