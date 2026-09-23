import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { FormularioDeTurma } from "@/features/turmas/components/formulario-de-turma";
import { obterTurma } from "@/features/turmas/services/turmas.server";

export const metadata: Metadata = { title: "Editar turma" };

export default async function EditarTurmaPage({
  params,
}: PageProps<"/gestao/turmas/[id]/editar">) {
  await exigirPermissao("cadastros", "gerenciar");
  const { id } = await params;

  const turma = await obterTurma(id);
  if (!turma) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">
          Editar turma {turma.codigo}
        </h1>
      </div>

      <FormularioDeTurma
        turma={turma}
        anoLetivoPadrao={new Date().getFullYear()}
      />
    </div>
  );
}
