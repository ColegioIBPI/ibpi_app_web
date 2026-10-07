import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { FormularioDeDocumento } from "@/features/documentos/components/formulario";

export const metadata: Metadata = { title: "Novo documento" };

export default async function NovoDocumentoPage() {
  await exigirPermissao("cadastros", "gerenciar");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/documentos"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Documentos
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">Novo documento</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Entra na lista de onde a família escolhe ao pedir uma declaração.
        </p>
      </div>

      <FormularioDeDocumento />
    </div>
  );
}
