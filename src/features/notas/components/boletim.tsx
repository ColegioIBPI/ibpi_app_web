import { cn } from "@/core/lib/cn";
import { formatGrade, formatPercent } from "@/core/lib/format";
import {
  ROTULOS_DE_SITUACAO,
  type Dependencia,
  type Eletiva,
  type LinhaDoBoletim,
  type ProjetoBilingue,
  type SituacaoFinal,
} from "@/core/modelo";

/**
 * Boletim do aluno, nos quatro blocos do `MODELO DE BOLETIM.xlsx`:
 * disciplinas regulares, Projeto Bilíngue, eletivas e dependências.
 *
 * É um componente de servidor sem interação: o mesmo boletim serve a tela
 * da família, a conferência da secretaria e a impressão em PDF.
 */

export interface BoletimProps {
  nome: string;
  matricula: string;
  turmaCodigo: string | null;
  anoLetivo: number;
  disciplinas: LinhaDoBoletim[];
  faltasPorTrimestre: Record<string, number>;
  percentualDeFrequencia: number | null;
  situacao: SituacaoFinal;
  projetoBilingue?: ProjetoBilingue | null;
  eletivas?: Eletiva[];
  dependencias?: Dependencia[];
  observacoes?: string | null;
}

const TRIMESTRES = ["1", "2", "3"] as const;

export function Boletim({
  nome,
  matricula,
  turmaCodigo,
  anoLetivo,
  disciplinas,
  faltasPorTrimestre,
  percentualDeFrequencia,
  situacao,
  projetoBilingue,
  eletivas = [],
  dependencias = [],
  observacoes,
}: BoletimProps) {
  return (
    <article className="flex flex-col gap-6">
      <header className="border-line flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-3">
        <div>
          <h2 className="text-ink text-lg font-semibold">{nome}</h2>
          <p className="text-ink-muted text-sm">
            Matrícula {matricula}
            {turmaCodigo ? ` · Turma ${turmaCodigo}` : ""} · {anoLetivo}
          </p>
        </div>

        <Situacao situacao={situacao} />
      </header>

      {disciplinas.length === 0 ? (
        <p className="text-ink-muted text-sm">
          Nenhuma nota lançada neste ano letivo.
        </p>
      ) : (
        <section>
          <h3 className="text-ink mb-2 text-sm font-medium">Disciplinas</h3>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <caption className="sr-only">
                Médias por trimestre, média anual e situação
              </caption>
              <thead>
                <tr className="border-line border-b text-left">
                  <th scope="col" className="text-ink-muted py-2 pr-3 font-medium">
                    Disciplina
                  </th>
                  {TRIMESTRES.map((t) => (
                    <th
                      key={t}
                      scope="col"
                      className="text-ink-muted w-14 py-2 pr-3 text-right font-medium"
                    >
                      {t}º
                    </th>
                  ))}
                  <th scope="col" className="text-ink-muted w-16 py-2 pr-3 text-right font-medium">
                    Anual
                  </th>
                  <th scope="col" className="text-ink-muted w-14 py-2 pr-3 text-right font-medium">
                    Rec.
                  </th>
                  <th scope="col" className="text-ink-muted w-16 py-2 pr-3 text-right font-medium">
                    Final
                  </th>
                  <th scope="col" className="text-ink-muted w-14 py-2 pr-3 text-right font-medium">
                    Faltas
                  </th>
                  <th scope="col" className="text-ink-muted py-2 font-medium">
                    Situação
                  </th>
                </tr>
              </thead>

              <tbody className="divide-line divide-y">
                {disciplinas.map((linha) => (
                  <tr key={linha.disciplinaId}>
                    <th scope="row" className="text-ink py-2 pr-3 text-left font-normal">
                      {linha.disciplinaNome}
                    </th>

                    {TRIMESTRES.map((t) => (
                      <Nota key={t} valor={linha.mediasPorTrimestre[t] ?? null} />
                    ))}

                    <Nota valor={linha.mediaAnual} forte />
                    <Nota valor={linha.recuperacao} />
                    <Nota valor={linha.mediaFinal} forte />

                    <td className="text-ink-muted py-2 pr-3 text-right tabular-nums">
                      {linha.faltas}
                    </td>

                    <td className="py-2">
                      <Situacao situacao={linha.situacao} compacta />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="border-line grid gap-3 border-t pt-4 sm:grid-cols-2">
        <div>
          <h3 className="text-ink mb-1 text-sm font-medium">
            Faltas por trimestre
          </h3>
          <p className="text-ink-muted text-sm tabular-nums">
            {TRIMESTRES.map((t) => `${t}º: ${faltasPorTrimestre[t] ?? 0}`).join(
              " · ",
            )}
          </p>
        </div>

        <div>
          <h3 className="text-ink mb-1 text-sm font-medium">
            Frequência no ano
          </h3>
          <p
            className={cn(
              "text-sm tabular-nums",
              percentualDeFrequencia !== null && percentualDeFrequencia < 0.75
                ? "text-danger font-medium"
                : "text-ink-muted",
            )}
          >
            {percentualDeFrequencia === null
              ? "Sem registro de frequência"
              : `${formatPercent(percentualDeFrequencia)} — mínimo de 75%`}
          </p>
        </div>
      </section>

      {projetoBilingue && projetoBilingue.componentes.length > 0 && (
        <section className="border-line border-t pt-4">
          <h3 className="text-ink mb-2 text-sm font-medium">
            Projeto Bilíngue
            {projetoBilingue.nivel ? ` — ${projetoBilingue.nivel}` : ""}
          </h3>

          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Notas do Projeto Bilíngue por trimestre
            </caption>
            <thead>
              <tr className="border-line border-b text-left">
                <th scope="col" className="text-ink-muted py-2 pr-3 font-medium">
                  Componente
                </th>
                {TRIMESTRES.map((t) => (
                  <th
                    key={t}
                    scope="col"
                    className="text-ink-muted w-14 py-2 pr-3 text-right font-medium"
                  >
                    {t}º
                  </th>
                ))}
                <th scope="col" className="text-ink-muted w-14 py-2 text-right font-medium">
                  Rec.
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {projetoBilingue.componentes.map((componente) => (
                <tr key={componente.nome}>
                  <th scope="row" className="text-ink py-2 pr-3 text-left font-normal">
                    {componente.nome}
                  </th>
                  {TRIMESTRES.map((t) => (
                    <Nota key={t} valor={componente.trimestres[t] ?? null} />
                  ))}
                  <Nota valor={componente.recuperacao} />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {eletivas.length > 0 && (
        <section className="border-line border-t pt-4">
          <h3 className="text-ink mb-2 text-sm font-medium">Eletivas</h3>
          <ul className="divide-line divide-y text-sm">
            {eletivas.map((eletiva, indice) => (
              <li
                key={`${eletiva.nome}-${indice}`}
                className="flex flex-wrap items-baseline justify-between gap-2 py-2"
              >
                <span className="text-ink">{eletiva.nome}</span>
                <span className="text-ink-muted">
                  {eletiva.periodo ? `${eletiva.periodo} · ` : ""}
                  {ROTULOS_DE_ELETIVA[eletiva.situacao]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dependencias.length > 0 && (
        <section className="border-line border-t pt-4">
          <h3 className="text-ink mb-2 text-sm font-medium">
            Dependência e reclassificação
          </h3>

          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Provas de dependência, com total, média e situação
            </caption>
            <thead>
              <tr className="border-line border-b text-left">
                <th scope="col" className="text-ink-muted py-2 pr-3 font-medium">
                  Disciplina
                </th>
                <th scope="col" className="text-ink-muted w-14 py-2 pr-3 text-right font-medium">
                  P1
                </th>
                <th scope="col" className="text-ink-muted w-14 py-2 pr-3 text-right font-medium">
                  P2
                </th>
                <th scope="col" className="text-ink-muted w-16 py-2 pr-3 text-right font-medium">
                  Total
                </th>
                <th scope="col" className="text-ink-muted w-14 py-2 pr-3 text-right font-medium">
                  Rec.
                </th>
                <th scope="col" className="text-ink-muted w-16 py-2 pr-3 text-right font-medium">
                  Média
                </th>
                <th scope="col" className="text-ink-muted py-2 font-medium">
                  Situação
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {dependencias.map((dependencia, indice) => (
                <tr key={`${dependencia.disciplinaId}-${indice}`}>
                  <th scope="row" className="text-ink py-2 pr-3 text-left font-normal">
                    {dependencia.disciplinaNome}
                    {dependencia.anoDeOrigem ? (
                      <span className="text-ink-muted text-xs">
                        {" "}
                        ({dependencia.anoDeOrigem})
                      </span>
                    ) : null}
                  </th>
                  <Nota valor={dependencia.p1} />
                  <Nota valor={dependencia.p2} />
                  <Nota valor={dependencia.total} />
                  <Nota valor={dependencia.recuperacao} />
                  <Nota valor={dependencia.media} forte />
                  <td className="py-2">
                    <Situacao situacao={dependencia.situacao} compacta />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {observacoes && (
        <section className="border-line border-t pt-4">
          <h3 className="text-ink mb-1 text-sm font-medium">Observações</h3>
          <p className="text-ink-muted text-sm whitespace-pre-line">
            {observacoes}
          </p>
        </section>
      )}
    </article>
  );
}

const ROTULOS_DE_ELETIVA: Record<Eletiva["situacao"], string> = {
  cursando: "Cursando",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function Nota({ valor, forte }: { valor: number | null; forte?: boolean }) {
  return (
    <td
      className={cn(
        "py-2 pr-3 text-right tabular-nums",
        valor !== null && valor < 5 ? "text-danger" : "text-ink",
        forte && "font-medium",
      )}
    >
      {valor === null ? "—" : formatGrade(valor)}
    </td>
  );
}

const CORES: Record<SituacaoFinal, string> = {
  cursando: "bg-surface-subtle text-ink-muted",
  aprovado: "bg-success-surface text-success",
  recuperacao: "bg-warning-surface text-warning",
  reprovado: "bg-danger-surface text-danger",
  "reprovado-por-falta": "bg-danger-surface text-danger",
};

function Situacao({
  situacao,
  compacta,
}: {
  situacao: SituacaoFinal;
  compacta?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2 py-1 font-medium",
        compacta ? "text-xs" : "text-sm",
        CORES[situacao],
      )}
    >
      {ROTULOS_DE_SITUACAO[situacao]}
    </span>
  );
}
