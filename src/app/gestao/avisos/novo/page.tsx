import type { Metadata } from "next";

import { exigirPermissao } from "@/core/auth/guards";
import {
  opcoesDeDestino,
  turmasDaConta,
} from "@/core/escola/destinos.server";
import { FormularioDeAviso } from "@/features/avisos/components/formulario-de-aviso";
import { destinosPermitidos } from "@/features/avisos/domain/destinatarios";

export const metadata: Metadata = { title: "Novo aviso" };

export default async function NovoAvisoPage() {
  const sessao = await exigirPermissao("avisos", "lancar");

  const minhasTurmas = await turmasDaConta(sessao.uid, sessao.role);
  const { turmas, alunos, responsaveis } = await opcoesDeDestino(minhasTurmas);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Novo aviso</h1>
        <p className="text-ink-muted mt-1 text-sm">
          O aviso aparece no Portal de quem for destinatário.
        </p>
      </div>

      <FormularioDeAviso
        destinosPermitidos={destinosPermitidos(sessao.role)}
        turmas={turmas}
        alunos={alunos}
        responsaveis={responsaveis}
      />
    </div>
  );
}
