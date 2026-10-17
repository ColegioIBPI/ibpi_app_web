import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { listarAlunosVisiveis } from "@/features/alunos/services/alunos.server";
import { FormularioDeRecibo } from "@/features/recibos/components/formulario";
import { seriesAbertas } from "@/features/recibos/services/recibos.server";

export const metadata: Metadata = { title: "Emitir recibo" };

export default async function NovoReciboPage({
  searchParams,
}: PageProps<"/gestao/recibos/novo">) {
  const sessao = await exigirPermissao("recibos", "lancar");
  const { matricula } = await searchParams;

  const [alunos, series] = await Promise.all([
    listarAlunosVisiveis(sessao),
    seriesAbertas(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/recibos"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Recibos
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">Emitir recibo</h1>
      </div>

      <FormularioDeRecibo
        alunos={alunos.map((aluno) => ({
          matricula: aluno.matricula,
          nome: aluno.nome,
        }))}
        series={series.map((serie) => ({
          serie: serie.serie,
          descricao: serie.descricao ?? null,
          proximoNumero: serie.proximoNumero,
        }))}
        matriculaInicial={typeof matricula === "string" ? matricula : undefined}
      />
    </div>
  );
}
