import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { descreverDestino } from "@/core/modelo";
import { formatDate } from "@/core/lib/format";
import { Card } from "@/core/ui/card";
import { AnexosDoAviso } from "@/features/avisos/components/anexos-do-aviso";
import { BotaoDePublicacao } from "@/features/avisos/components/botao-de-publicacao";
import { obterAvisoVisivel } from "@/features/avisos/services/avisos.server";

export async function generateMetadata({
  params,
}: PageProps<"/gestao/avisos/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Aviso ${id.slice(0, 6)}` };
}

export default async function AvisoPage({
  params,
}: PageProps<"/gestao/avisos/[id]">) {
  const sessao = await exigirPermissao("avisos", "lancar");
  const { id } = await params;

  const aviso = await obterAvisoVisivel(sessao, id);
  if (!aviso) notFound();

  const gerencia =
    sessao.role === "secretaria" || sessao.role === "coordenacao";
  const meu = aviso.publicadoPorUid === sessao.uid;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/gestao/avisos"
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Avisos
          </Link>

          <h1 className="text-ink mt-2 text-xl font-semibold">
            {aviso.titulo}
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            {descreverDestino(aviso.destino)} · publicado por{" "}
            {aviso.publicadoPorNome ?? "—"} em {formatDate(aviso.publicadoEm)}
            {aviso.ativo ? "" : " · despublicado"}
          </p>
        </div>

        {(gerencia || meu) && (
          <BotaoDePublicacao id={aviso.id} ativo={aviso.ativo} />
        )}
      </div>

      <Card>
        <p className="text-ink text-sm whitespace-pre-wrap">{aviso.corpo}</p>
      </Card>

      {aviso.anexos.length > 0 && (
        <Card title="Anexos">
          <AnexosDoAviso avisoId={aviso.id} anexos={aviso.anexos} />
        </Card>
      )}
    </div>
  );
}
