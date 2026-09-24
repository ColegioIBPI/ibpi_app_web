import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { exigirPermissao } from "@/core/auth/guards";
import { cn } from "@/core/lib/cn";
import { formatCurrency, formatDate } from "@/core/lib/format";
import { BotaoDeExportacao } from "@/core/ui/botao-de-exportacao";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { FiltrosDoFinanceiro } from "@/features/financeiro/components/filtros-do-financeiro";
import {
  filtrarLinhas,
  recorteDaQuery,
  resumir,
} from "@/features/financeiro/domain/lista";
import { situacaoFinanceiraDaEscola } from "@/features/financeiro/services/financeiro.server";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage({
  searchParams,
}: PageProps<"/gestao/financeiro">) {
  const sessao = await exigirPermissao("financeiro", "ler");
  const filtros = await searchParams;

  const linhas = await situacaoFinanceiraDaEscola(sessao);
  const recorte = recorteDaQuery(filtros.situacao);

  const encontrados = filtrarLinhas(linhas, {
    termo: typeof filtros.q === "string" ? filtros.q : undefined,
    turma: typeof filtros.turma === "string" ? filtros.turma : undefined,
    recorte,
  });

  const resumo = resumir(linhas);

  const turmas = [
    ...new Set(linhas.map((l) => l.turmaCodigo).filter((t): t is string => !!t)),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  // O relatório e a planilha saem com o mesmo recorte que está na tela.
  const exportacao = new URLSearchParams({ situacao: recorte });
  if (typeof filtros.turma === "string" && filtros.turma) {
    exportacao.set("turma", filtros.turma);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold">Financeiro</h1>
          <p className="text-ink-muted mt-1 text-sm">
            Controle interno — nenhum pagamento é processado pelo sistema.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/gestao/financeiro/relatorio?${exportacao.toString()}`}
            className="border-line bg-surface text-ink hover:bg-surface-subtle inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium"
          >
            <FileText className="size-4" aria-hidden />
            Relatório para PDF
          </Link>

          <BotaoDeExportacao
            href={`/api/exportacoes/inadimplencia?${exportacao.toString()}`}
          />
        </div>
      </div>

      <Card>
        <dl className="grid gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-ink-muted text-sm">Vencido em aberto</dt>
            <dd className="text-danger text-xl font-semibold tabular-nums">
              {formatCurrency(resumo.vencido)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted text-sm">Total em aberto</dt>
            <dd className="text-ink text-xl font-semibold tabular-nums">
              {formatCurrency(resumo.emAberto)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted text-sm">Com parcela vencida</dt>
            <dd className="text-ink text-xl font-semibold tabular-nums">
              {resumo.inadimplentes}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted text-sm">Alunos</dt>
            <dd className="text-ink text-xl font-semibold tabular-nums">
              {resumo.alunos}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <Suspense>
          <FiltrosDoFinanceiro turmas={turmas} />
        </Suspense>
      </Card>

      <Card>
        {encontrados.length === 0 ? (
          <EmptyState
            title={
              recorte === "vencidas"
                ? "Ninguém com parcela vencida"
                : "Nenhum aluno encontrado"
            }
            description={
              recorte === "vencidas"
                ? "Nenhuma parcela passou do vencimento sem pagamento."
                : "Ajuste a busca para encontrar o aluno."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <caption className="sr-only">
                Situação financeira por aluno
              </caption>
              <thead>
                <tr className="border-line border-b text-left">
                  <th scope="col" className="text-ink-muted py-2 pr-3 font-medium">
                    Aluno
                  </th>
                  <th scope="col" className="text-ink-muted py-2 pr-3 font-medium">
                    Turma
                  </th>
                  <th scope="col" className="text-ink-muted py-2 pr-3 text-right font-medium">
                    Contratado
                  </th>
                  <th scope="col" className="text-ink-muted py-2 pr-3 text-right font-medium">
                    Pago
                  </th>
                  <th scope="col" className="text-ink-muted py-2 pr-3 text-right font-medium">
                    Em aberto
                  </th>
                  <th scope="col" className="text-ink-muted py-2 text-right font-medium">
                    Vencido
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {encontrados.map((linha) => (
                  <tr key={linha.matricula}>
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      <Link
                        href={`/gestao/financeiro/${linha.matricula}`}
                        className="text-brand-600 font-medium hover:underline"
                      >
                        {linha.nome}
                      </Link>
                      {linha.vencidaDesde && (
                        <span className="text-ink-muted block text-xs">
                          vencida desde {formatDate(linha.vencidaDesde)}
                        </span>
                      )}
                    </th>
                    <td className="text-ink-muted py-2 pr-3">
                      {linha.turmaCodigo ?? "—"}
                    </td>
                    <td className="text-ink-muted py-2 pr-3 text-right tabular-nums">
                      {formatCurrency(linha.totais.contratado)}
                    </td>
                    <td className="text-ink-muted py-2 pr-3 text-right tabular-nums">
                      {formatCurrency(linha.totais.pago)}
                    </td>
                    <td className="text-ink py-2 pr-3 text-right tabular-nums">
                      {formatCurrency(linha.totais.emAberto)}
                    </td>
                    <td
                      className={cn(
                        "py-2 text-right tabular-nums",
                        linha.totais.vencido > 0
                          ? "text-danger font-medium"
                          : "text-ink-muted",
                      )}
                    >
                      {formatCurrency(linha.totais.vencido)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
