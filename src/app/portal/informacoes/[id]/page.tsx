import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirArea } from "@/core/auth/guards";
import { ROTULOS_DE_INFORMACAO } from "@/core/modelo";
import { Card } from "@/core/ui/card";
import { IconeDaInformacao } from "@/features/informacoes/components/cards";
import { obterInformacaoVisivel } from "@/features/informacoes/services/informacoes.server";

export async function generateMetadata({
  params,
}: PageProps<"/portal/informacoes/[id]">): Promise<Metadata> {
  const sessao = await exigirArea("consulta");
  const { id } = await params;
  const informacao = await obterInformacaoVisivel(sessao, id);

  return { title: informacao?.titulo ?? "Informação" };
}

export default async function InformacaoDoPortalPage({
  params,
}: PageProps<"/portal/informacoes/[id]">) {
  const sessao = await exigirArea("consulta");
  const { id } = await params;

  // `null` aqui é "não existe" ou "não é para você", e os dois viram 404.
  const informacao = await obterInformacaoVisivel(sessao, id);
  if (!informacao) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/portal/informacoes"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Informações úteis
        </Link>

        <h1 className="text-ink mt-2 flex items-center gap-2 text-xl font-semibold">
          <IconeDaInformacao
            tipo={informacao.tipo}
            className="text-brand-600 size-5 shrink-0"
          />
          {informacao.titulo}
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          {ROTULOS_DE_INFORMACAO[informacao.tipo]}
        </p>
      </div>

      <Card>
        {/* `whitespace-pre-wrap`: o que a secretaria digitou em linhas
            separadas continua em linhas separadas. */}
        <p className="text-ink text-sm whitespace-pre-wrap">
          {informacao.conteudo}
        </p>
      </Card>

      {informacao.url && (
        <a
          href={informacao.url}
          target="_blank"
          // `noopener` impede a página aberta de mexer nesta; `noreferrer`
          // evita contar de onde a família veio.
          rel="noopener noreferrer"
          className="text-brand-600 inline-flex items-center gap-1.5 text-sm hover:underline"
        >
          <ExternalLink className="size-4" aria-hidden />
          Abrir o material completo
        </a>
      )}
    </div>
  );
}
