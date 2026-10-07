import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { ListaDaFamilia } from "@/features/solicitacoes/components/lista-da-familia";
import { listarDaFamilia } from "@/features/solicitacoes/services/solicitacoes.server";

export const metadata: Metadata = { title: "Solicitações" };

export default async function SolicitacoesDoPortalPage() {
  const sessao = await exigirPermissao("solicitacoes", "lancar");
  const solicitacoes = await listarDaFamilia(sessao);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold">Solicitações</h1>
          <p className="text-ink-muted mt-1 text-sm">
            Pedidos feitos à secretaria e o andamento de cada um.
          </p>
        </div>

        <Link
          href="/portal/solicitacoes/nova"
          className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white"
        >
          <Plus className="size-4" aria-hidden />
          Nova solicitação
        </Link>
      </div>

      {solicitacoes.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum pedido ainda"
            description="Peça aqui uma declaração à secretaria e acompanhe o andamento."
          />
        </Card>
      ) : (
        <ListaDaFamilia solicitacoes={solicitacoes} />
      )}
    </div>
  );
}
