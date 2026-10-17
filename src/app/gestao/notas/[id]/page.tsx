import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { trimestreDaQuery } from "@/core/lib/ano-letivo";
import { Card } from "@/core/ui/card";
import { SeletorDeTrimestre } from "@/core/ui/seletor-de-trimestre";
import { EmptyState } from "@/core/ui/states";
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Turma } from "@/core/modelo";
import { CriterioPublicado } from "@/features/cursos/components/criterio-publicado";
import { criterioPublicado } from "@/features/cursos/services/criterios.server";
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

  /**
   * O critério da turma, em leitura.
   *
   * O professor não alcança a tela de Configurações — ela exige
   * `cadastros: gerenciar`, que ele não tem. Sem isto, a regra que ele
   * aplica ao lançar nota existiria só no boletim da família.
   *
   * Rascunho **incluído**, porque ele é equipe e a coordenação discute o
   * critério com quem vai aplicá-lo; o componente o marca como rascunho.
   */
  const turmaDoc = await getAdminDb()
    .collection(COLECOES.turmas)
    .doc(alocacao.turmaId)
    .get();

  const criterio = await criterioPublicado(
    alocacao.anoLetivo,
    turmaDoc.exists ? ((turmaDoc.data() as Turma).segmento ?? null) : null,
    false,
  );

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

      {criterio && (
        <Card
          title="Como o aluno é avaliado"
          description={`Critério de ${criterio.anoLetivo}, definido pela coordenação.`}
        >
          <CriterioPublicado criterio={criterio} semSeparador />
        </Card>
      )}

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
