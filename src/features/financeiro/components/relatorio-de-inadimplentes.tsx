import { formatCurrency, formatDate } from "@/core/lib/format";
import {
  descreverResponsaveis,
  type ParcelaAberta,
  type ResponsavelDoRelatorio,
} from "@/features/financeiro/domain/abertas";

/**
 * Relatório diário de inadimplentes, no formato que o colégio já imprime.
 *
 * **Agrupado por aluno, com uma linha por parcela e um total por aluno** —
 * é como a folha do Access sai, e é o que quem cobra lê: a lista de
 * vencimentos de cada família, não um número só.
 *
 * O PDF sai pela impressão do navegador, como o boletim. Gerar no servidor
 * exigiria manter uma segunda descrição do documento em sincronia com esta.
 */

export interface GrupoDoRelatorio {
  matricula: string;
  nome: string;
  turmaCodigo: string | null;
  parcelas: ParcelaAberta[];
  responsaveis: ResponsavelDoRelatorio[];
  total: number;
}

export function RelatorioDeInadimplentes({
  grupos,
  anoLetivo,
  posicaoAte,
}: {
  grupos: GrupoDoRelatorio[];
  anoLetivo: number;
  /** A data de corte: parcelas não pagas vencidas até aqui. */
  posicaoAte: string;
}) {
  const total = grupos.reduce((soma, grupo) => soma + grupo.total, 0);

  return (
    <article className="text-[11px]">
      <header className="border-ink/30 mb-3 flex items-start justify-between border-b pb-2">
        <div>
          <h1 className="text-ink text-sm font-bold">
            Relatório Diário de Inadimplentes
          </h1>
          <p className="text-ink-muted">Colégio IBPI · Ref.: {anoLetivo}</p>
        </div>

        <div className="text-right">
          <p className="text-ink">
            Posição até: <strong>{formatDate(posicaoAte)}</strong>
          </p>
          <p className="text-ink-muted">
            {grupos.length} {grupos.length === 1 ? "aluno" : "alunos"} ·{" "}
            {formatCurrency(total)}
          </p>
        </div>
      </header>

      {grupos.length === 0 ? (
        <p className="text-ink py-6 text-center">
          Nenhuma parcela em aberto até esta data.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <caption className="sr-only">
            Parcelas em aberto por aluno, com os responsáveis
          </caption>

          <thead>
            <tr className="border-ink/30 border-b text-left">
              <th scope="col" className="w-20 py-1 pr-2 font-semibold">
                Matrícula
              </th>
              <th scope="col" className="py-1 pr-2 font-semibold">
                Aluno
              </th>
              <th scope="col" className="w-28 py-1 pr-2 font-semibold">
                Vencimento
              </th>
              <th scope="col" className="py-1 pr-2 font-semibold">
                Descrição
              </th>
              <th scope="col" className="w-28 py-1 text-right font-semibold">
                Valor
              </th>
            </tr>
          </thead>

          {/*
            Um `tbody` por aluno: é ele que o navegador tenta não quebrar
            entre páginas, e um bloco de parcelas partido ao meio faz o
            total aparecer sozinho no alto da folha seguinte.
          */}
          {grupos.map((grupo) => (
            <tbody
              key={grupo.matricula}
              className="border-ink/15 border-b [break-inside:avoid]"
            >
              <tr>
                <td className="py-1 pr-2 align-top tabular-nums">
                  {grupo.matricula}
                </td>
                <td
                  className="py-1 pr-2 align-top"
                  rowSpan={grupo.parcelas.length || 1}
                >
                  <span className="font-medium">{grupo.nome}</span>
                  {grupo.turmaCodigo && (
                    <span className="text-ink-muted"> · {grupo.turmaCodigo}</span>
                  )}

                  {/* Os responsáveis entram embaixo do nome, e não em
                      colunas: são quem a escola liga, e caberiam mal numa
                      coluna estreita numa folha já cheia. */}
                  <span className="text-ink-muted block text-[10px] leading-tight">
                    {descreverResponsaveis(grupo.responsaveis) ||
                      "Sem responsável vinculado"}
                  </span>
                </td>

                <PrimeiraParcela parcela={grupo.parcelas[0]} />
              </tr>

              {grupo.parcelas.slice(1).map((parcela) => (
                <tr key={parcela.id}>
                  <td />
                  <td className="py-0.5 pr-2 tabular-nums">
                    {formatDate(parcela.vencimento)}
                  </td>
                  <td className="text-ink-muted py-0.5 pr-2">
                    {descricaoDa(parcela)}
                  </td>
                  <td className="py-0.5 text-right tabular-nums">
                    {formatCurrency(parcela.saldo)}
                  </td>
                </tr>
              ))}

              <tr>
                <td />
                <td colSpan={2} className="py-1 pr-2 text-right font-semibold">
                  Total
                </td>
                <td className="border-ink/30 border-t py-1 text-right font-semibold tabular-nums">
                  {formatCurrency(grupo.total)}
                </td>
              </tr>
            </tbody>
          ))}

          <tfoot>
            <tr className="border-ink/40 border-t-2">
              <td colSpan={4} className="py-1.5 pr-2 text-right font-bold">
                Total geral
              </td>
              <td className="py-1.5 text-right font-bold tabular-nums">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      <p className="text-ink-muted mt-3 text-[10px]">
        Emitido em {formatDate(new Date())}. Os valores são o **saldo** de
        cada parcela — pagamento parcial já está descontado.
      </p>
    </article>
  );
}

function PrimeiraParcela({ parcela }: { parcela: ParcelaAberta | undefined }) {
  if (!parcela) {
    return (
      <>
        <td colSpan={2} className="text-ink-muted py-1">
          Sem parcela
        </td>
        <td className="py-1 text-right tabular-nums">—</td>
      </>
    );
  }

  return (
    <>
      <td className="py-1 pr-2 align-top tabular-nums">
        {formatDate(parcela.vencimento)}
      </td>
      <td className="text-ink-muted py-1 pr-2 align-top">
        {descricaoDa(parcela)}
      </td>
      <td className="py-1 text-right align-top tabular-nums">
        {formatCurrency(parcela.saldo)}
      </td>
    </>
  );
}

/** `Mensalidade 2/12` — a descrição com a parcela, como foi pedido. */
function descricaoDa(parcela: ParcelaAberta): string {
  return [parcela.descricao, parcela.parcela].filter(Boolean).join(" ");
}
