import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { BotaoDeDisponibilidade } from "@/features/documentos/components/botao-de-disponibilidade";
import { FormularioDeDocumento } from "@/features/documentos/components/formulario";
import { obterDocumento } from "@/features/documentos/services/documentos.server";

export async function generateMetadata({
  params,
}: PageProps<"/gestao/documentos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const documento = await obterDocumento(id);

  return { title: documento?.nome ?? "Documento" };
}

export default async function DocumentoPage({
  params,
}: PageProps<"/gestao/documentos/[id]">) {
  await exigirPermissao("cadastros", "gerenciar");
  const { id } = await params;

  const documento = await obterDocumento(id);
  if (!documento) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/gestao/documentos"
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Documentos
          </Link>

          <h1 className="text-ink mt-2 text-xl font-semibold">
            {documento.nome}
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            {documento.ativo
              ? "Na lista da família"
              : "Fora da lista da família"}
          </p>
        </div>

        <BotaoDeDisponibilidade id={documento.id} ativo={documento.ativo} />
      </div>

      <FormularioDeDocumento documento={documento} />
    </div>
  );
}
