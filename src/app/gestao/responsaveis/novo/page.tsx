import type { Metadata } from "next";

import { exigirPermissao } from "@/core/auth/guards";
import { FormularioDeResponsavel } from "@/features/responsaveis/components/formulario";

export const metadata: Metadata = { title: "Novo responsável" };

export default async function NovoResponsavelPage() {
  await exigirPermissao("cadastros", "gerenciar");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Novo responsável</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Um responsável pode ter vários alunos vinculados.
        </p>
      </div>

      <FormularioDeResponsavel />
    </div>
  );
}
