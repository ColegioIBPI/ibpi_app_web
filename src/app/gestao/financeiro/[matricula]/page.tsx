import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { pode } from "@/core/auth/roles";
import { formatCurrency, formatDate } from "@/core/lib/format";
import { ROTULOS_DE_CONTRATO } from "@/core/modelo";
import { Card } from "@/core/ui/card";
import { Extrato } from "@/features/financeiro/components/extrato";
import { NovoPlano } from "@/features/financeiro/components/novo-plano";
import { extratoDoAluno } from "@/features/financeiro/services/financeiro.server";

export const metadata: Metadata = { title: "Extrato financeiro" };

export default async function ExtratoDoAlunoPage({
  params,
}: PageProps<"/gestao/financeiro/[matricula]">) {
  const sessao = await exigirPermissao("financeiro", "ler");
  const { matricula } = await params;

  // Aluno fora do escopo responde 404, como no resto do sistema.
  const extrato = await extratoDoAluno(sessao, matricula);
  if (!extrato) notFound();

  // Secretaria e coordenação leem o financeiro, mas quem lança é o perfil
  // financeiro (ver a matriz em `core/auth/roles.ts`).
  const podeLancar = pode(sessao.role, "financeiro", "lancar");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/financeiro"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Financeiro
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">{extrato.nome}</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Matrícula {extrato.matricula}
          {extrato.turmaCodigo ? ` · Turma ${extrato.turmaCodigo}` : ""}
        </p>
      </div>

      <Card>
        <dl className="grid gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-ink-muted text-sm">Contratado</dt>
            <dd className="text-ink text-lg font-semibold tabular-nums">
              {formatCurrency(extrato.totais.contratado)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted text-sm">Pago</dt>
            <dd className="text-success text-lg font-semibold tabular-nums">
              {formatCurrency(extrato.totais.pago)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted text-sm">Em aberto</dt>
            <dd className="text-ink text-lg font-semibold tabular-nums">
              {formatCurrency(extrato.totais.emAberto)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted text-sm">Vencido</dt>
            <dd className="text-danger text-lg font-semibold tabular-nums">
              {formatCurrency(extrato.totais.vencido)}
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Parcelas">
        <Extrato cobrancas={extrato.cobrancas} podeLancar={podeLancar} />
      </Card>

      {extrato.contratos.length > 0 && (
        <Card
          title="Itens contratados"
          description="Vieram do sistema antigo, com o texto original preservado."
        >
          <ul className="divide-line divide-y text-sm">
            {extrato.contratos.map((contrato, indice) => (
              <li
                key={`${contrato.tipo}-${indice}`}
                className="flex flex-wrap items-baseline justify-between gap-2 py-2"
              >
                <span className="text-ink">
                  {ROTULOS_DE_CONTRATO[contrato.tipo]}
                  {contrato.data ? (
                    <span className="text-ink-muted">
                      {" "}
                      · {formatDate(contrato.data)}
                    </span>
                  ) : null}
                  <span className="text-ink-muted block text-xs">
                    {contrato.descricao}
                  </span>
                </span>
                <span className="text-ink tabular-nums">
                  {contrato.valor === null
                    ? "—"
                    : formatCurrency(contrato.valor)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {podeLancar && (
        <Card
          title="Novo plano de pagamento"
          description="Gera o carnê a partir do valor total, do número de parcelas e do primeiro vencimento."
        >
          <NovoPlano matricula={extrato.matricula} />
        </Card>
      )}
    </div>
  );
}
