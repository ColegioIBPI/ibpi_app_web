import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { opcoesDeDestino } from "@/core/escola/destinos.server";
import { FormularioDeInformacao } from "@/features/informacoes/components/formulario";

export const metadata: Metadata = { title: "Nova informação" };

export default async function NovaInformacaoPage() {
  await exigirPermissao("avisos", "gerenciar");

  const { turmas, alunos, responsaveis } = await opcoesDeDestino();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/informacoes"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Informações úteis
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">Nova informação</h1>
        <p className="text-ink-muted mt-1 text-sm">
          O card aparece no Portal e no aplicativo de quem for destinatário.
        </p>
      </div>

      <FormularioDeInformacao
        turmas={turmas}
        alunos={alunos}
        responsaveis={responsaveis}
      />
    </div>
  );
}
