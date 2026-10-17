import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import { FormularioDeCriterio } from "@/features/cursos/components/formulario-de-criterio";
import { cursosAtivos } from "@/features/cursos/services/cursos.server";
import {
  idDoCriterio,
  obterCriterio,
} from "@/features/cursos/services/criterios.server";

export const metadata: Metadata = { title: "Critérios de avaliação" };

export default async function AvaliacaoPage({
  searchParams,
}: PageProps<"/gestao/configuracoes/avaliacao">) {
  await exigirPermissao("cadastros", "gerenciar");

  const { ano, curso } = await searchParams;
  const anoLetivo = typeof ano === "string" ? Number(ano) : anoLetivoAtual();
  const cursoCodigo = typeof curso === "string" && curso ? curso : null;

  const [cursos, criterio] = await Promise.all([
    cursosAtivos(),
    obterCriterio(idDoCriterio(anoLetivo, cursoCodigo)),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/configuracoes"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Configurações
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">
          Critérios de avaliação
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          O que o colégio divulga a professores e famílias sobre como o aluno é
          avaliado. Um critério por ano letivo — o de um ano não substitui o do
          anterior.
        </p>
      </div>

      <FormularioDeCriterio
        anoLetivo={anoLetivo}
        cursos={cursos}
        criterio={criterio}
      />
    </div>
  );
}
