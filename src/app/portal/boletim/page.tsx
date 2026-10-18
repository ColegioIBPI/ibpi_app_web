import type { Metadata } from "next";

import { exigirArea } from "@/core/auth/guards";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { Boletim } from "@/features/notas/components/boletim";
import { BotaoDeImpressao } from "@/core/ui/botao-de-impressao";
import { CriterioPublicado } from "@/features/cursos/components/criterio-publicado";
import { resumoDoCriterio } from "@/features/cursos/domain/criterio";
import { criterioPublicado } from "@/features/cursos/services/criterios.server";
import {
  TRIMESTRES,
  trimestresLiberados,
  ultimoLiberado,
} from "@/features/notas/domain/liberacao";
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

  /**
   * Um critério por boletim, e não um só na página: filhos em cursos
   * diferentes podem ter critérios diferentes, e mostrar o de um ao lado do
   * boletim do outro seria pior que não mostrar nada.
   */
  const criterios = new Map(
    await Promise.all(
      boletins.map(
        async (boletim) =>
          [
            boletim.matricula,
            await criterioPublicado(ano, boletim.cursoCodigo),
          ] as const,
      ),
    ),
  );

  // O resumo do cabeçalho sai do critério publicado quando existe um. A
  // frase fixa que estava aqui só mudaria no dia em que alguém lembrasse
  // de editar o código.
  const primeiro = boletins[0] && criterios.get(boletins[0].matricula);

  return (
    <div className="flex flex-col gap-6">
      <div
        data-impressao="ocultar"
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-ink text-xl font-semibold">Boletim</h1>
          <p className="text-ink-muted mt-1 text-sm">
            {primeiro
              ? resumoDoCriterio(primeiro)
              : "Média do trimestre = (Projeto + Tarefas + AV) ÷ 3. Aprovação com média 5,0 e frequência de 75%."}
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
        boletins.map((boletim) => {
          const liberados = trimestresLiberados(boletim);

          /**
           * Sem nenhum trimestre liberado, a família **não vê grade
           * nenhuma** — e precisa saber por quê.
           *
           * Mostrar o boletim vazio faria parecer que o colégio não lançou
           * nada, e a ligação para a secretaria seria a mesma que a
           * liberação quis evitar.
           */
          if (liberados.length === 0) {
            return (
              <Card key={boletim.matricula} title={boletim.nome}>
                <EmptyState
                  title="Boletim ainda não liberado"
                  description="As notas são publicadas quando o trimestre fecha. Assim que o colégio liberar, o boletim aparece aqui."
                />
              </Card>
            );
          }

          return (
          <Card key={boletim.matricula}>
            <Boletim
              nome={boletim.nome}
              matricula={boletim.matricula}
              turmaCodigo={boletim.turmaCodigo}
              segmentoRotulo={boletim.segmentoRotulo}
              serie={boletim.serie}
              dataMatricula={boletim.dataMatricula}
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

            {/* Qual trimestre a família está vendo. Sem isto, quem abre
                em novembro com só o 1º liberado acha que o colégio parou
                de lançar nota. */}
            <p className="text-ink-muted mt-4 text-xs">
              {liberados.length === TRIMESTRES.length
                ? "Todos os trimestres liberados."
                : `Liberado até o ${ultimoLiberado(boletim)}º trimestre. Os demais aparecem quando o colégio publicar.`}
            </p>

            <CriterioPublicado
              criterio={criterios.get(boletim.matricula) ?? null}
            />
          </Card>
          );
        })
      )}
    </div>
  );
}
