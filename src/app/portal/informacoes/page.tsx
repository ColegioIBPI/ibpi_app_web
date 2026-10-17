import type { Metadata } from "next";

import { exigirArea } from "@/core/auth/guards";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import { CriterioPublicado } from "@/features/cursos/components/criterio-publicado";
import { criteriosDaFamilia } from "@/features/cursos/services/criterios.server";
import { CardsDeInformacao } from "@/features/informacoes/components/cards";
import { listarInformacoesPara } from "@/features/informacoes/services/informacoes.server";

export const metadata: Metadata = { title: "Informações úteis" };

export default async function InformacoesDoPortalPage() {
  const sessao = await exigirArea("consulta");
  const ano = anoLetivoAtual();

  const [informacoes, criterios] = await Promise.all([
    listarInformacoesPara(sessao),
    criteriosDaFamilia(sessao, ano),
  ]);

  // O "nada publicado" só vale quando não há **nada** — com o critério na
  // tela, dizer que não há nada seria desmentir o que está logo abaixo.
  const vazio = informacoes.length === 0 && criterios.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Informações úteis</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Calendário, horários e documentos do colégio.
        </p>
      </div>

      {vazio ? (
        <Card>
          <EmptyState
            title="Nada publicado por enquanto"
            description="O calendário, os horários e os documentos do colégio aparecem aqui."
          />
        </Card>
      ) : (
        <>
          {informacoes.length > 0 && (
            <CardsDeInformacao informacoes={informacoes} />
          )}

          {/*
            O critério vem **depois** do material do colégio: aqui ele é
            consulta de quem procurou, e não a resposta a uma pergunta
            recém-feita — essa já é dada no boletim, onde a dúvida nasce.
          */}
          {criterios.map((grupo) => (
            <Card
              key={grupo.criterio.id}
              title="Como o aluno é avaliado"
              description={
                // O curso só é dito quando há mais de um critério na tela:
                // com um só, o rótulo não informa nada e vira ruído.
                criterios.length > 1
                  ? `${grupo.cursos.join(" · ")} · ${grupo.criterio.anoLetivo}`
                  : `Critério de ${grupo.criterio.anoLetivo}`
              }
            >
              {/* `className` zera a borda de cima do componente, que lá no
                  boletim separa o critério das notas e aqui separaria de
                  nada. */}
              <CriterioPublicado criterio={grupo.criterio} semSeparador />
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
