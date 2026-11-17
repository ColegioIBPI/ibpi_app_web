import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { Card } from "@/core/ui/card";
import { CorpoDoTopico } from "@/features/ajuda/components/corpo";
import { ehDoPerfil } from "@/features/ajuda/domain/topico";
import { TOPICOS } from "@/features/ajuda/domain/topicos";

export async function generateMetadata({
  params,
}: PageProps<"/gestao/ajuda/[id]">): Promise<Metadata> {
  const { id } = await params;
  const topico = TOPICOS.find((atual) => atual.id === id);

  return { title: topico ? `${topico.titulo} · Ajuda` : "Ajuda" };
}

/** Endereço estável por assunto: dá para mandar o link a um colega. */
export function generateStaticParams() {
  return TOPICOS.map((topico) => ({ id: topico.id }));
}

export default async function TopicoDaAjudaPage({
  params,
}: PageProps<"/gestao/ajuda/[id]">) {
  const sessao = await exigirPermissao("cadastros", "ler");
  const { id } = await params;

  const topico = TOPICOS.find((atual) => atual.id === id);
  if (!topico) notFound();

  // O filtro do índice é preferência de leitura, não permissão: um link
  // de assunto fora da função abre normalmente, só avisa que é de outra.
  const daMinhaFuncao = ehDoPerfil(topico, sessao.role);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/ajuda"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Ajuda
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">{topico.titulo}</h1>
        <p className="text-ink-muted mt-1 text-sm">
          {topico.resumo}
          {topico.onde ? ` · ${topico.onde}` : ""}
        </p>
      </div>

      {!daMinhaFuncao && (
        <p className="border-line bg-surface-subtle text-ink-muted rounded-md border px-3 py-2 text-sm">
          Este assunto é de outra função. Está aqui para consulta — as telas
          continuam sendo as suas.
        </p>
      )}

      <Card>
        <CorpoDoTopico blocos={topico.blocos} />
      </Card>
    </div>
  );
}
