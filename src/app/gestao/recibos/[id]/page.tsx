import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { pode } from "@/core/auth/roles";
import { BotaoDeImpressao } from "@/core/ui/botao-de-impressao";
import { Card } from "@/core/ui/card";
import { CancelarRecibo } from "@/features/recibos/components/cancelar";
import { ReciboImpresso } from "@/features/recibos/components/recibo-impresso";
import { podeCancelar } from "@/features/recibos/domain/recibo";
import { obterRecibo } from "@/features/recibos/services/recibos.server";
import { listarCursos } from "@/features/cursos/services/cursos.server";

export async function generateMetadata({
  params,
}: PageProps<"/gestao/recibos/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Recibo ${id}` };
}

export default async function ReciboPage({
  params,
}: PageProps<"/gestao/recibos/[id]">) {
  const sessao = await exigirPermissao("recibos", "ler");
  const { id } = await params;

  const recibo = await obterRecibo(id);
  if (!recibo) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div
        data-impressao="ocultar"
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <Link
          href="/gestao/recibos"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Recibos
        </Link>

        <div className="flex gap-2">
          {pode(sessao.role, "recibos", "lancar") && podeCancelar(recibo) && (
            <CancelarRecibo id={recibo.id} />
          )}
          <BotaoDeImpressao />
        </div>
      </div>

      <Card>
        <ReciboImpresso recibo={recibo} cursos={await listarCursos()} />
      </Card>
    </div>
  );
}
