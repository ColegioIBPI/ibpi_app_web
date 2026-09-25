import type { Metadata } from "next";

import { exigirArea } from "@/core/auth/guards";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { CardsDeInformacao } from "@/features/informacoes/components/cards";
import { listarInformacoesPara } from "@/features/informacoes/services/informacoes.server";

export const metadata: Metadata = { title: "Informações úteis" };

export default async function InformacoesDoPortalPage() {
  const sessao = await exigirArea("consulta");
  const informacoes = await listarInformacoesPara(sessao);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Informações úteis</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Calendário, horários e documentos do colégio.
        </p>
      </div>

      {informacoes.length === 0 ? (
        <Card>
          <EmptyState
            title="Nada publicado por enquanto"
            description="O calendário, os horários e os documentos do colégio aparecem aqui."
          />
        </Card>
      ) : (
        <CardsDeInformacao informacoes={informacoes} />
      )}
    </div>
  );
}
