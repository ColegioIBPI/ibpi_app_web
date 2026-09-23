import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { FormularioDeResponsavel } from "@/features/responsaveis/components/formulario";
import { obterResponsavel } from "@/features/responsaveis/services/responsaveis.server";

export const metadata: Metadata = { title: "Editar responsável" };

export default async function EditarResponsavelPage({
  params,
}: PageProps<"/gestao/responsaveis/[id]/editar">) {
  await exigirPermissao("cadastros", "gerenciar");
  const { id } = await params;

  const responsavel = await obterResponsavel(id);
  if (!responsavel) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Editar responsável</h1>
        <p className="text-ink-muted mt-1 text-sm">
          O vínculo com os alunos é gerenciado na ficha.
        </p>
      </div>

      <FormularioDeResponsavel responsavel={responsavel} />
    </div>
  );
}
