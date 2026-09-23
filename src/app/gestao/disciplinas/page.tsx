import type { Metadata } from "next";

import { exigirPermissao } from "@/core/auth/guards";
import { pode } from "@/core/auth/roles";
import { Card } from "@/core/ui/card";
import { GestaoDeDisciplinas } from "@/features/turmas/components/gestao-de-disciplinas";
import { listarDisciplinas } from "@/features/turmas/services/turmas.server";

export const metadata: Metadata = { title: "Disciplinas" };

export default async function DisciplinasPage() {
  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const disciplinas = await listarDisciplinas();

  const ativas = disciplinas.filter((d) => d.ativa).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Disciplinas</h1>
        <p className="text-ink-muted mt-1 text-sm">
          {disciplinas.length}{" "}
          {disciplinas.length === 1 ? "disciplina" : "disciplinas"}
          {ativas !== disciplinas.length ? ` · ${ativas} ativas` : ""}
        </p>
      </div>

      <Card>
        <GestaoDeDisciplinas
          disciplinas={disciplinas}
          podeEditar={pode(sessao.role, "cadastros", "gerenciar")}
        />
      </Card>
    </div>
  );
}
