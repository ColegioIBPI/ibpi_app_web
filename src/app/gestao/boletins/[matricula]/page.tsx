import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { pode } from "@/core/auth/roles";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import { Card } from "@/core/ui/card";
import { Boletim } from "@/features/notas/components/boletim";
import { BlocosDoBoletim } from "@/features/notas/components/blocos-do-boletim";
import { BotaoDeImpressao } from "@/features/notas/components/botao-de-impressao";
import { boletimDoAluno } from "@/features/notas/services/notas.server";

export const metadata: Metadata = { title: "Boletim" };

export default async function BoletimDoAlunoPage({
  params,
  searchParams,
}: PageProps<"/gestao/boletins/[matricula]">) {
  const sessao = await exigirPermissao("notas", "ler");
  const { matricula } = await params;
  const filtros = await searchParams;
  const ano = Number(filtros.ano) || anoLetivoAtual();

  // Aluno fora do escopo responde 404, como no resto do sistema.
  const boletim = await boletimDoAluno(sessao, matricula, ano);
  if (!boletim) notFound();

  const bilingue = boletim.documento?.projetoBilingue ?? null;
  const podeEditar = pode(sessao.role, "notas", "gerenciar");

  return (
    <div className="flex flex-col gap-6">
      <div
        data-impressao="ocultar"
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <Link
            href="/gestao/boletins"
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Boletins
          </Link>

          <h1 className="text-ink mt-2 text-xl font-semibold">
            Boletim de {boletim.nome}
          </h1>
        </div>

        <BotaoDeImpressao />
      </div>

      <Card>
        <Boletim
          nome={boletim.nome}
          matricula={boletim.matricula}
          turmaCodigo={boletim.turmaCodigo}
          anoLetivo={boletim.anoLetivo}
          disciplinas={boletim.disciplinas}
          faltasPorTrimestre={boletim.faltasPorTrimestre}
          percentualDeFrequencia={boletim.percentualDeFrequencia}
          situacao={boletim.situacao}
          projetoBilingue={bilingue}
          eletivas={boletim.documento?.eletivas}
          dependencias={boletim.dependencias}
          observacoes={boletim.documento?.observacoes}
        />
      </Card>

      {podeEditar && (
        <div data-impressao="ocultar">
          <Card
            title="Lançamentos do boletim"
            description="Recuperação final, Projeto Bilíngue, eletivas, dependências e observações."
          >
            <BlocosDoBoletim
            matricula={boletim.matricula}
            anoLetivo={boletim.anoLetivo}
            disciplinas={boletim.disciplinas}
            recuperacoes={boletim.documento?.recuperacoes ?? {}}
            eletivas={boletim.documento?.eletivas ?? []}
            dependencias={boletim.dependencias}
            nivelBilingue={bilingue?.nivel ?? null}
            notasBilingue={Object.fromEntries(
              (bilingue?.componentes ?? []).map((componente) => [
                componente.nome,
                componente.trimestres,
              ]),
            )}
            recuperacaoBilingue={Object.fromEntries(
              (bilingue?.componentes ?? []).map((componente) => [
                componente.nome,
                componente.recuperacao,
              ]),
            )}
              observacoes={boletim.documento?.observacoes ?? null}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
