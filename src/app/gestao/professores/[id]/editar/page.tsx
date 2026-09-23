import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { FormularioDeProfessorComponent } from "@/features/professores/components/formulario";
import { obterProfessor } from "@/features/professores/services/professores.server";

export const metadata: Metadata = { title: "Editar professor" };

export default async function EditarProfessorPage({
  params,
}: PageProps<"/gestao/professores/[id]/editar">) {
  await exigirPermissao("cadastros", "gerenciar");
  const { id } = await params;

  const professor = await obterProfessor(id);
  if (!professor) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Editar professor</h1>
        <p className="text-ink-muted mt-1 text-sm">
          As turmas são gerenciadas na ficha, pelas alocações.
        </p>
      </div>

      <FormularioDeProfessorComponent professor={professor} />
    </div>
  );
}
