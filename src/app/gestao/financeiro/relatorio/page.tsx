import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { formatCurrency, formatDate } from "@/core/lib/format";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { BotaoDeImpressao } from "@/core/ui/botao-de-impressao";
import {
  filtrarLinhas,
  recorteDaQuery,
  resumir,
} from "@/features/financeiro/domain/lista";
import { situacaoFinanceiraDaEscola } from "@/features/financeiro/services/financeiro.server";

export const metadata: Metadata = { title: "Relatório de inadimplência" };

const ROTULOS = {
  vencidas: "Alunos com parcela vencida",
  "em-aberto": "Alunos com saldo em aberto",
  todos: "Todos os alunos",
} as const;

/**
 * Relatório de inadimplência pronto para imprimir.
 *
 * O PDF sai pela impressão do navegador, como o boletim: gerar no servidor
 * exigiria manter uma segunda descrição do relatório em sincronia com a
 * tela, e é assim que as duas acabam divergindo.
 */
export default async function RelatorioDeInadimplenciaPage({
  searchParams,
}: PageProps<"/gestao/financeiro/relatorio">) {
  const sessao = await exigirPermissao("financeiro", "ler");
  const filtros = await searchParams;

  const turma = typeof filtros.turma === "string" ? filtros.turma : undefined;
  const recorte = recorteDaQuery(filtros.situacao);

  const todas = await situacaoFinanceiraDaEscola(sessao);
  const linhas = filtrarLinhas(todas, { turma, recorte });
  const resumo = resumir(linhas);

  return (
    <div className="flex flex-col gap-6">
      <div
        data-impressao="ocultar"
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <Link
          href="/gestao/financeiro"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Financeiro
        </Link>

        <BotaoDeImpressao />
      </div>

      <Card>
        <header className="border-line mb-4 border-b pb-3">
          <h1 className="text-ink text-lg font-semibold">
            Relatório de inadimplência
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Colégio IBPI · {ROTULOS[recorte]}
            {turma ? ` · Turma ${turma}` : " · Todas as turmas"} · Emitido em{" "}
            {formatDate(new Date())}
          </p>
        </header>

        <dl className="border-line mb-4 grid gap-4 border-b pb-4 sm:grid-cols-3">
          <div>
            <dt className="text-ink-muted text-sm">Alunos no relatório</dt>
            <dd className="text-ink text-lg font-semibold tabular-nums">
              {linhas.length}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted text-sm">Total em aberto</dt>
            <dd className="text-ink text-lg font-semibold tabular-nums">
              {formatCurrency(resumo.emAberto)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted text-sm">Total vencido</dt>
            <dd className="text-danger text-lg font-semibold tabular-nums">
              {formatCurrency(resumo.vencido)}
            </dd>
          </div>
        </dl>

        {linhas.length === 0 ? (
          <EmptyState
            title="Nada a relatar"
            description="Nenhum aluno se encaixa neste recorte."
          />
        ) : (
          <table className="w-full border-collapse text-sm">
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
                  Pago
                </th>
                <th scope="col" className="text-ink-muted py-2 pr-3 text-right font-medium">
                  Em aberto
                </th>
                <th scope="col" className="text-ink-muted py-2 pr-3 text-right font-medium">
                  Vencido
                </th>
                <th scope="col" className="text-ink-muted py-2 font-medium">
                  Vencida desde
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
                  <td className="text-ink-muted py-2 pr-3">
                    {linha.turmaCodigo ?? "—"}
                  </td>
                  <td className="text-ink-muted py-2 pr-3 text-right tabular-nums">
                    {formatCurrency(linha.totais.pago)}
                  </td>
                  <td className="text-ink py-2 pr-3 text-right tabular-nums">
                    {formatCurrency(linha.totais.emAberto)}
                  </td>
                  <td className="text-danger py-2 pr-3 text-right font-medium tabular-nums">
                    {formatCurrency(linha.totais.vencido)}
                  </td>
                  <td className="text-ink-muted py-2 tabular-nums">
                    {linha.vencidaDesde ? formatDate(linha.vencidaDesde) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-line border-t-2 font-medium">
                <td className="text-ink py-2 pr-3" colSpan={3}>
                  Total
                </td>
                <td className="text-ink py-2 pr-3 text-right tabular-nums">
                  {formatCurrency(resumo.emAberto)}
                </td>
                <td className="text-danger py-2 pr-3 text-right tabular-nums">
                  {formatCurrency(resumo.vencido)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </Card>
    </div>
  );
}
