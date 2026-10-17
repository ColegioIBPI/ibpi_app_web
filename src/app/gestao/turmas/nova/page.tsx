import type { Metadata } from "next";

import { exigirPermissao } from "@/core/auth/guards";
import { FormularioDeTurma } from "@/features/turmas/components/formulario-de-turma";
import { cursosAtivos } from "@/features/cursos/services/cursos.server";

export const metadata: Metadata = { title: "Nova turma" };

export default async function NovaTurmaPage() {
  await exigirPermissao("cadastros", "gerenciar");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Nova turma</h1>
        <p className="text-ink-muted mt-1 text-sm">
          O código e o ano formam o identificador da turma.
        </p>
      </div>

      <FormularioDeTurma
        anoLetivoPadrao={new Date().getFullYear()}
        cursos={await cursosAtivos()}
      />
    </div>
  );
}
