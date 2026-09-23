import type { Metadata } from "next";

import { exigirPermissao } from "@/core/auth/guards";
import { FormularioDeProfessorComponent } from "@/features/professores/components/formulario";

export const metadata: Metadata = { title: "Novo professor" };

export default async function NovoProfessorPage() {
  await exigirPermissao("cadastros", "gerenciar");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Novo professor</h1>
        <p className="text-ink-muted mt-1 text-sm">
          As turmas vêm das alocações, definidas depois de salvar.
        </p>
      </div>

      <FormularioDeProfessorComponent />
    </div>
  );
}
