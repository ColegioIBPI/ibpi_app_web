import { formatCurrency, formatDate } from "@/core/lib/format";
import {
  ROTULOS_DE_COBRANCA,
  ROTULOS_DE_FORMA_DE_PAGAMENTO,
  ROTULOS_DE_TIPO_DE_COBRANCA,
  type Cobranca,
} from "@/core/modelo";
import {
  saldo,
  situacaoDaCobranca,
} from "@/features/financeiro/domain/cobranca";
import {
  descreverResponsaveis,
  type ResponsavelDoRelatorio,
} from "@/features/financeiro/domain/abertas";

export interface ParcelaDaFicha extends Cobranca {
  id: string;
}

/**
 * Ficha financeira do aluno: **todas** as parcelas do ano, pagas e não
 * pagas, para imprimir.
 *
 * Não é o extrato da tela nem o relatório de inadimplentes. Aqui a
 * pergunta é outra — "o que esta família pagou e quando?" —, e por isso o
 * documento inclui o que já foi quitado, com a data e a forma de cada
 * pagamento. Mostrar só o que falta responderia outra coisa.
 */
export function FichaFinanceira({
  nome,
  matricula,
  turmaCodigo,
  parcelas,
  responsaveis,
  planoAcordado,
}: {
  nome: string;
  matricula: string;
  turmaCodigo: string | null;
  parcelas: ParcelaDaFicha[];
  responsaveis: ResponsavelDoRelatorio[];
  planoAcordado: string | null;
}) {
  const totais = parcelas.reduce(
    (soma, parcela) => ({
      contratado: soma.contratado + (parcela.valor ?? 0),
      pago: soma.pago + (parcela.valorPago ?? 0),
      saldo: soma.saldo + (parcela.dataPagamento ? 0 : saldo(parcela)),
    }),
    { contratado: 0, pago: 0, saldo: 0 },
  );

  return (
    <article className="text-[11px]">
      <header className="border-ink/40 mb-3 border-b pb-2">
        <h1 className="text-ink text-sm font-bold">
          Colégio IBPI · Ficha Financeira
        </h1>
        <p className="text-ink mt-1">
          <strong>{nome}</strong> · Matrícula {matricula}
          {turmaCodigo ? ` · ${turmaCodigo}` : ""}
        </p>
        <p className="text-ink-muted">
          {descreverResponsaveis(responsaveis) || "Sem responsável vinculado"}
        </p>
      </header>

      <dl className="border-ink/20 mb-3 grid grid-cols-3 gap-3 border-b pb-2">
        <Total rotulo="Contratado" valor={totais.contratado} />
        <Total rotulo="Pago" valor={totais.pago} />
        <Total rotulo="Em aberto" valor={totais.saldo} />
      </dl>

      {parcelas.length === 0 ? (
        <p className="text-ink py-6 text-center">
          Nenhuma parcela lançada para este aluno.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <caption className="sr-only">Parcelas do aluno</caption>
          <thead>
            <tr className="border-ink/30 border-b text-left">
              <th scope="col" className="py-1 pr-2 font-semibold">Vencimento</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Descrição</th>
              <th scope="col" className="py-1 pr-2 text-right font-semibold">Valor</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Pago em</th>
              <th scope="col" className="py-1 pr-2 text-right font-semibold">Valor pago</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Forma</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Recibo</th>
              <th scope="col" className="py-1 font-semibold">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-ink/10 divide-y">
            {parcelas.map((parcela) => (
              <tr key={parcela.id}>
                <td className="py-1 pr-2 tabular-nums">
                  {formatDate(parcela.vencimento)}
                </td>
                <td className="py-1 pr-2">
                  {parcela.tipo
                    ? ROTULOS_DE_TIPO_DE_COBRANCA[parcela.tipo]
                    : "—"}
                  {parcela.parcela && parcela.totalDeParcelas
                    ? ` ${parcela.parcela}/${parcela.totalDeParcelas}`
                    : ""}
                </td>
                <td className="py-1 pr-2 text-right tabular-nums">
                  {formatCurrency(parcela.valor ?? 0)}
                </td>
                <td className="py-1 pr-2 tabular-nums">
                  {parcela.dataPagamento ? formatDate(parcela.dataPagamento) : ""}
                </td>
                <td className="py-1 pr-2 text-right tabular-nums">
                  {parcela.valorPago ? formatCurrency(parcela.valorPago) : ""}
                </td>
                <td className="py-1 pr-2">
                  {parcela.formaDePagamento
                    ? ROTULOS_DE_FORMA_DE_PAGAMENTO[parcela.formaDePagamento]
                    : (parcela.banco ?? "")}
                </td>
                <td className="py-1 pr-2">{parcela.recibo ?? ""}</td>
                <td className="py-1">
                  {ROTULOS_DE_COBRANCA[situacaoDaCobranca(parcela)]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {planoAcordado && (
        <div className="border-ink/20 mt-3 border-t pt-2">
          <h2 className="text-ink text-[11px] font-bold uppercase">
            Plano acordado na matrícula
          </h2>
          <p className="text-ink whitespace-pre-wrap">{planoAcordado}</p>
        </div>
      )}

      <p className="text-ink-muted mt-3 text-[10px]">
        Emitido em {formatDate(new Date())}. A anotação interna do financeiro
        não entra nesta ficha — ela é da equipe, e a ficha vai para a família.
      </p>
    </article>
  );
}

function Total({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div>
      <dt className="text-ink-muted text-[9px] uppercase">{rotulo}</dt>
      <dd className="text-ink text-sm font-semibold tabular-nums">
        {formatCurrency(valor)}
      </dd>
    </div>
  );
}
