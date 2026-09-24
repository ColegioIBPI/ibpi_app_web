import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { exigirPermissao } from "@/core/auth/guards";
import { cn } from "@/core/lib/cn";
import { formatDate, formatPercent } from "@/core/lib/format";
import {
  COLECOES,
  type Aluno,
  type DiarioDeClasse,
  type FrequenciaDiaria,
} from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";
import { BotaoDeExportacao } from "@/core/ui/botao-de-exportacao";
import { BotaoDeImpressao } from "@/core/ui/botao-de-impressao";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { SeletorDoPeriodo } from "@/features/frequencia/components/seletor-do-periodo";
import {
  consolidarPeriodo,
  diariosNoPeriodo,
  disciplinasDoPeriodo,
  periodoDaQuery,
  periodoInvertido,
  resumirPeriodo,
} from "@/features/frequencia/domain/periodo";

export const metadata: Metadata = { title: "Frequência por período" };

export default async function RelatorioDeFrequenciaPage({
  searchParams,
}: PageProps<"/gestao/frequencia/relatorio">) {
  const sessao = await exigirPermissao("frequencia", "lancar");
  const filtros = await searchParams;

  const db = getAdminDb();

  // O professor só relata as turmas que leciona.
  const minhasTurmas =
    sessao.role === "professor"
      ? (((await db.collection(COLECOES.users).doc(sessao.uid).get()).data()
          ?.turmas as string[]) ?? [])
      : null;

  const turmas = (await db.collection(COLECOES.turmas).get()).docs
    .filter((doc) => !minhasTurmas || minhasTurmas.includes(doc.id))
    .map((doc) => ({ id: doc.id, codigo: doc.data().codigo as string }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));

  const turmaId =
    typeof filtros.turma === "string" && turmas.some((t) => t.id === filtros.turma)
      ? filtros.turma
      : (turmas[0]?.id ?? null);

  const periodo = periodoDaQuery(filtros.de, filtros.ate);
  const invertido = periodoInvertido(periodo);
  const turma = turmas.find((t) => t.id === turmaId);

  const alunos = turmaId
    ? (
        await db
          .collection(COLECOES.alunos)
          .where("turmaId", "==", turmaId)
          .where("ativo", "==", true)
          .get()
      ).docs
        .map((doc) => doc.data() as Aluno)
        .map((aluno) => ({ matricula: aluno.matricula, nome: aluno.nome }))
    : [];

  const lancamentos =
    turmaId && !invertido
      ? (
          await db
            .collection(COLECOES.frequenciaDiaria)
            .where("turmaId", "==", turmaId)
            .where("data", ">=", periodo.de)
            .where("data", "<=", periodo.ate)
            .get()
        ).docs.map((doc) => doc.data() as FrequenciaDiaria)
      : [];

  // As faltas do diário de classe contam **aulas**, não dias: elas entram
  // no relatório como um quadro à parte, para a secretaria ver o que o
  // professor marcou sem misturar com a contagem oficial.
  const diarios =
    turmaId && !invertido
      ? diariosNoPeriodo(
          (
            await db
              .collection(COLECOES.diarioClasse)
              .where("turmaId", "==", turmaId)
              .get()
          ).docs.map((doc) => doc.data() as DiarioDeClasse),
          periodo,
        )
      : [];

  const linhas = consolidarPeriodo(alunos, lancamentos, diarios);
  const resumo = resumirPeriodo(linhas);
  const disciplinas = disciplinasDoPeriodo(linhas);

  const exportacao = new URLSearchParams({
    turma: turmaId ?? "",
    de: periodo.de,
    ate: periodo.ate,
  });

  return (
    <div className="flex flex-col gap-6">
      <div
        data-impressao="ocultar"
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <Link
          href="/gestao/frequencia"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Frequência
        </Link>

        <div className="flex flex-wrap gap-2">
          <BotaoDeImpressao />
          {turmaId && !invertido && (
            <BotaoDeExportacao
              href={`/api/exportacoes/frequencia?${exportacao.toString()}`}
            />
          )}
        </div>
      </div>

      <div data-impressao="ocultar">
        <Card>
          <Suspense>
            <SeletorDoPeriodo
              turmas={turmas}
              turmaId={turmaId}
              de={periodo.de}
              ate={periodo.ate}
            />
          </Suspense>
        </Card>
      </div>

      <Card>
        <header className="border-line mb-4 border-b pb-3">
          <h1 className="text-ink text-lg font-semibold">
            Frequência por período
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Colégio IBPI
            {turma ? ` · Turma ${turma.codigo}` : ""} · {formatDate(periodo.de)}{" "}
            a {formatDate(periodo.ate)}
          </p>
        </header>

        {invertido ? (
          <p
            role="alert"
            className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
          >
            O início do período vem depois do fim.
          </p>
        ) : !turma ? (
          <EmptyState
            title="Nenhuma turma disponível"
            description="Cadastre uma turma para emitir o relatório."
          />
        ) : linhas.length === 0 ? (
          <EmptyState
            title="Nenhum aluno nesta turma"
            description="Matricule alunos na turma para emitir o relatório."
          />
        ) : (
          <>
            <dl className="border-line mb-4 grid gap-4 border-b pb-4 sm:grid-cols-4">
              <div>
                <dt className="text-ink-muted text-sm">Alunos</dt>
                <dd className="text-ink text-lg font-semibold tabular-nums">
                  {resumo.alunos}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted text-sm">Dias registrados</dt>
                <dd className="text-ink text-lg font-semibold tabular-nums">
                  {resumo.dias}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted text-sm">Presença da turma</dt>
                <dd className="text-ink text-lg font-semibold tabular-nums">
                  {resumo.percentual === null
                    ? "—"
                    : formatPercent(resumo.percentual)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted text-sm">Abaixo de 75%</dt>
                <dd
                  className={cn(
                    "text-lg font-semibold tabular-nums",
                    resumo.abaixoDoMinimo > 0 ? "text-danger" : "text-ink",
                  )}
                >
                  {resumo.abaixoDoMinimo}
                </dd>
              </div>
            </dl>

            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Frequência por aluno no período
              </caption>
              <thead>
                <tr className="border-line border-b text-left">
                  <th scope="col" className="text-ink-muted py-2 pr-3 font-medium">
                    Aluno
                  </th>
                  <th scope="col" className="text-ink-muted py-2 pr-3 text-right font-medium">
                    Dias
                  </th>
                  <th scope="col" className="text-ink-muted py-2 pr-3 text-right font-medium">
                    Presenças
                  </th>
                  <th scope="col" className="text-ink-muted py-2 pr-3 text-right font-medium">
                    Faltas
                  </th>
                  <th scope="col" className="text-ink-muted py-2 pr-3 text-right font-medium">
                    Atrasos
                  </th>
                  <th scope="col" className="text-ink-muted py-2 text-right font-medium">
                    Presença
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {linhas.map((linha) => (
                  <tr key={linha.matricula}>
                    <th scope="row" className="text-ink py-2 pr-3 text-left font-normal">
                      {linha.nome}
                      <span className="text-ink-muted block text-xs">
                        {linha.matricula}
                      </span>
                    </th>
                    <td className="text-ink-muted py-2 pr-3 text-right tabular-nums">
                      {linha.contadores.dias}
                    </td>
                    <td className="text-ink-muted py-2 pr-3 text-right tabular-nums">
                      {linha.contadores.presencas}
                    </td>
                    <td className="text-danger py-2 pr-3 text-right tabular-nums">
                      {linha.contadores.faltas}
                    </td>
                    <td className="text-warning py-2 pr-3 text-right tabular-nums">
                      {linha.contadores.atrasos}
                    </td>
                    <td
                      className={cn(
                        "py-2 text-right font-medium tabular-nums",
                        linha.percentual !== null && linha.percentual < 0.75
                          ? "text-danger"
                          : "text-ink",
                      )}
                    >
                      {linha.percentual === null
                        ? "—"
                        : formatPercent(linha.percentual)}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
          </>
        )}
      </Card>

      {disciplinas.length > 0 && (
        <Card>
          <header className="border-line mb-3 border-b pb-2">
            <h2 className="text-ink text-base font-semibold">
              Faltas por disciplina
            </h2>
            <p className="text-ink-muted mt-0.5 text-sm">
              Do diário de classe do professor, que conta aulas. A contagem
              acima é do registro diário da secretaria, que conta dias — as
              duas não se somam.
            </p>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Faltas por aluno em cada disciplina, no período
              </caption>
              <thead>
                <tr className="border-line border-b text-left">
                  <th scope="col" className="text-ink-muted py-2 pr-3 font-medium">
                    Aluno
                  </th>
                  {disciplinas.map((disciplina) => (
                    <th
                      key={disciplina.disciplinaId}
                      scope="col"
                      className="text-ink-muted py-2 pr-3 text-right font-medium"
                    >
                      {disciplina.disciplinaNome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {linhas.map((linha) => (
                  <tr key={linha.matricula}>
                    <th scope="row" className="text-ink py-2 pr-3 text-left font-normal">
                      {linha.nome}
                    </th>
                    {disciplinas.map((disciplina) => {
                      const dado = linha.porDisciplina.find(
                        (d) => d.disciplinaId === disciplina.disciplinaId,
                      );

                      return (
                        <td
                          key={disciplina.disciplinaId}
                          className={cn(
                            "py-2 pr-3 text-right tabular-nums",
                            dado && dado.faltas > 0
                              ? "text-danger font-medium"
                              : "text-ink-muted",
                          )}
                        >
                          {dado
                            ? `${dado.faltas} de ${dado.aulas}`
                            : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
