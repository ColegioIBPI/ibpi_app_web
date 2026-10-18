import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import { Card } from "@/core/ui/card";
import { BotaoDeImpressao } from "@/core/ui/botao-de-impressao";
import { agruparPorAluno, aVencerAte } from "@/features/financeiro/domain/abertas";
import { RelatorioDeInadimplentes } from "@/features/financeiro/components/relatorio-de-inadimplentes";
import { parcelasEmAbertoDaEscola } from "@/features/financeiro/services/abertas.server";

export const metadata: Metadata = { title: "Relatório de inadimplentes" };

/**
 * Relatório diário de inadimplentes, pronto para imprimir.
 *
 * Substituiu a versão que somava o aluno numa linha. Esta é a folha que o
 * colégio já imprime: agrupada por aluno, uma linha por parcela e um total
 * por família.
 *
 * `ate` é a **posição**: parcelas não pagas vencidas até aquele dia. Sem
 * parâmetro, hoje — que é o uso diário e o que o nome do relatório diz.
 */
export default async function RelatorioDeInadimplentesPage({
  searchParams,
}: PageProps<"/gestao/financeiro/relatorio">) {
  const sessao = await exigirPermissao("financeiro", "ler");
  const filtros = await searchParams;

  const turma = typeof filtros.turma === "string" ? filtros.turma : undefined;
  const ate =
    typeof filtros.ate === "string" && filtros.ate
      ? filtros.ate
      : hojeNoBrasil();

  const { parcelas, responsaveisPorAluno } = await parcelasEmAbertoDaEscola(
    sessao,
    { turma },
  );

  const grupos = agruparPorAluno(aVencerAte(parcelas, ate)).map((grupo) => ({
    ...grupo,
    responsaveis: responsaveisPorAluno.get(grupo.matricula) ?? [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div
        data-impressao="ocultar"
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <Link
          href="/gestao/financeiro"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Financeiro
        </Link>

        <div className="flex flex-wrap items-end gap-3">
          {/*
            A posição é um GET no próprio relatório, sem JavaScript: a
            secretaria muda a data e imprime, e o link continua servindo
            para repetir a mesma folha depois.
          */}
          <form className="flex items-end gap-2">
            {turma && <input type="hidden" name="turma" value={turma} />}
            <label className="flex flex-col gap-1">
              <span className="text-ink-muted text-xs">Posição até</span>
              <input
                type="date"
                name="ate"
                defaultValue={ate}
                className="border-line bg-surface text-ink h-10 rounded-md border px-3 text-sm"
              />
            </label>
            <button
              type="submit"
              className="border-line bg-surface text-ink hover:bg-surface-subtle h-10 rounded-md border px-4 text-sm font-medium"
            >
              Atualizar
            </button>
          </form>

          <BotaoDeImpressao />
        </div>
      </div>

      <Card>
        <RelatorioDeInadimplentes
          grupos={grupos}
          anoLetivo={anoLetivoAtual()}
          posicaoAte={ate}
        />
      </Card>
    </div>
  );
}

/** `AAAA-MM-DD` no fuso do colégio — a Vercel roda em UTC. */
function hojeNoBrasil(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
