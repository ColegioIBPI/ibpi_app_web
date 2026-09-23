import type { Metadata } from "next";

import { exigirArea } from "@/core/auth/guards";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { Boletim } from "@/features/notas/components/boletim";
import { BotaoDeImpressao } from "@/features/notas/components/botao-de-impressao";
import { boletimDoAluno } from "@/features/notas/services/notas.server";

export const metadata: Metadata = { title: "Boletim" };

export default async function BoletimDoPortalPage({
  searchParams,
}: PageProps<"/portal/boletim">) {
  const sessao = await exigirArea("consulta");
  const filtros = await searchParams;

  const ano = Number(filtros.ano) || anoLetivoAtual();

  const matriculas =
    sessao.role === "aluno"
      ? sessao.matricula
        ? [sessao.matricula]
        : []
      : sessao.alunosVinculados;

  if (matriculas.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Nenhum aluno vinculado"
          description="Fale com a secretaria para vincular o seu acesso."
        />
      </Card>
    );
  }

  const boletins = (
    await Promise.all(
      matriculas.map((matricula) => boletimDoAluno(sessao, matricula, ano)),
    )
  ).filter((boletim) => boletim !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold">Boletim</h1>
          <p className="text-ink-muted mt-1 text-sm">
            Média do trimestre = (Projeto + Tarefas + AV) ÷ 3. Aprovação com
            média 5,0 e frequência de 75%.
          </p>
        </div>

        <BotaoDeImpressao />
      </div>

      {boletins.length === 0 ? (
        <Card>
          <EmptyState
            title="Boletim indisponível"
            description={`Nenhum boletim encontrado para ${ano}.`}
          />
        </Card>
      ) : (
        boletins.map((boletim) => (
          <Card key={boletim.matricula}>
            <Boletim
              nome={boletim.nome}
              matricula={boletim.matricula}
              turmaCodigo={boletim.turmaCodigo}
              anoLetivo={boletim.anoLetivo}
              disciplinas={boletim.disciplinas}
              faltasPorTrimestre={boletim.faltasPorTrimestre}
              percentualDeFrequencia={boletim.percentualDeFrequencia}
              situacao={boletim.situacao}
              projetoBilingue={boletim.documento?.projetoBilingue}
              eletivas={boletim.documento?.eletivas}
              dependencias={boletim.dependencias}
              observacoes={boletim.documento?.observacoes}
            />
          </Card>
        ))
      )}
    </div>
  );
}
