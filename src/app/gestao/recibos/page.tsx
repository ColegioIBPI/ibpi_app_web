import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { pode } from "@/core/auth/roles";
import { Card } from "@/core/ui/card";
import { ListaDeRecibos } from "@/features/recibos/components/lista";
import { SeriesDeRecibo } from "@/features/recibos/components/series";
import {
  listarRecibos,
  listarSeries,
} from "@/features/recibos/services/recibos.server";

export const metadata: Metadata = { title: "Recibos" };

export default async function RecibosPage() {
  const sessao = await exigirPermissao("recibos", "ler");

  // Coordenação confere e reimprime; quem emite é o caixa e o balcão.
  const podeEmitir = pode(sessao.role, "recibos", "lancar");
  const podeGerenciar = pode(sessao.role, "recibos", "gerenciar");

  const [recibos, series] = await Promise.all([
    listarRecibos(),
    listarSeries(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold">Recibos</h1>
          <p className="text-ink-muted mt-1 text-sm">
            Recibo emitido não se edita. Se sair errado, é cancelado com motivo
            e outro é emitido no lugar.
          </p>
        </div>

        {podeEmitir && (
          <Link
            href="/gestao/recibos/novo"
            className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white"
          >
            <Plus className="size-4" aria-hidden />
            Emitir recibo
          </Link>
        )}
      </div>

      <Card>
        <ListaDeRecibos recibos={recibos} />
      </Card>

      <Card
        title="Talões"
        description="A série define a numeração. Um talão por sequência de números."
      >
        <SeriesDeRecibo series={series} podeGerenciar={podeGerenciar} />
      </Card>
    </div>
  );
}
