import type { Metadata } from "next";

import { exigirArea } from "@/core/auth/guards";
import { formatDate } from "@/core/lib/format";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { AnexosDoAviso } from "@/features/avisos/components/anexos-do-aviso";
import { listarAvisosPara } from "@/features/avisos/services/avisos.server";

export const metadata: Metadata = { title: "Avisos" };

export default async function AvisosDoPortalPage() {
  const sessao = await exigirArea("consulta");
  const avisos = await listarAvisosPara(sessao);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Avisos</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Comunicados do colégio para você.
        </p>
      </div>

      {avisos.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum aviso por enquanto"
            description="Os comunicados do colégio aparecem aqui."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {avisos.map((aviso) => (
            <Card key={aviso.id} title={aviso.titulo}>
              <p className="text-ink-muted -mt-3 mb-3 text-xs">
                {formatDate(aviso.publicadoEm)}
                {aviso.publicadoPorNome ? ` · ${aviso.publicadoPorNome}` : ""}
              </p>

              <p className="text-ink text-sm whitespace-pre-wrap">
                {aviso.corpo}
              </p>

              {aviso.anexos.length > 0 && (
                <div className="border-line mt-4 border-t pt-3">
                  <AnexosDoAviso avisoId={aviso.id} anexos={aviso.anexos} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
