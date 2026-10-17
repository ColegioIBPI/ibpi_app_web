import Image from "next/image";

import { formatCurrency, formatDate } from "@/core/lib/format";
import {
  ROTULOS_DE_FORMA_DO_RECIBO,
  ROTULOS_DE_SERVICO,
  type ReciboComId,
} from "@/core/modelo";
import { rotuloDoCurso } from "@/features/cursos/domain/curso";
import { identificacao, totalDoRecibo } from "@/features/recibos/domain/recibo";

/**
 * O recibo como ele sai impresso.
 *
 * É a mesma marcação na tela e no papel — o `@media print` do
 * `globals.css` só esconde o que é navegação. Gerar um PDF no servidor
 * exigiria uma segunda descrição do documento para manter em sincronia
 * com esta, e é assim que o papel e a tela passam a discordar.
 *
 * **O cancelamento é impresso em cima do documento**, e não escondido num
 * rodapé: a 2ª via de um recibo cancelado circula, e quem a receber precisa
 * ver na primeira olhada que ela não vale.
 */
export function ReciboImpresso({
  recibo,
  cursos = [],
}: {
  recibo: ReciboComId;
  /** Só para o rótulo: o código do curso já está gravado no recibo. */
  cursos?: Array<{ codigo: string; nome: string }>;
}) {
  const cancelado = recibo.status === "cancelado";

  return (
    <article className="recibo mx-auto w-full max-w-3xl">
      <header className="border-ink/20 flex items-start justify-between gap-6 border-b pb-4">
        <div className="flex items-center gap-4">
          <Image
            src="/brand/logo-ibpi.png"
            alt="Colégio IBPI"
            width={128}
            height={58}
            className="h-12 w-auto"
          />
          <div>
            <h1 className="text-ink text-lg font-semibold">Recibo</h1>
            <p className="text-ink-muted text-sm">{identificacao(recibo)}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-ink-muted text-xs">Emitido em</p>
          <p className="text-ink text-sm font-medium">
            {formatDate(recibo.emitidoEm)}
          </p>
          <p className="text-ink-muted mt-1 text-xs">
            por {recibo.emissorNome}
          </p>
        </div>
      </header>

      {cancelado && (
        <p className="border-danger bg-danger-surface text-danger mt-4 rounded-md border px-3 py-2 text-sm font-semibold">
          RECIBO CANCELADO
          {recibo.cancelamento && (
            <span className="block text-xs font-normal">
              {formatDate(recibo.cancelamento.em)} ·{" "}
              {recibo.cancelamento.porNome} · {recibo.cancelamento.motivo}
            </span>
          )}
        </p>
      )}

      <dl className="border-ink/20 mt-4 grid gap-3 border-b pb-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-ink-muted text-xs">Matrícula</dt>
          <dd className="text-ink">{recibo.aluno.matricula}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-ink-muted text-xs">Aluno</dt>
          <dd className="text-ink font-medium">{recibo.aluno.nome}</dd>
        </div>
        <div>
          <dt className="text-ink-muted text-xs">Curso e série</dt>
          <dd className="text-ink">
            {rotuloDoCurso(recibo.aluno.curso, cursos)}
            {recibo.aluno.serie ? ` · ${recibo.aluno.serie}` : ""}
          </dd>
        </div>
      </dl>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-ink-muted border-ink/20 border-b text-left text-xs">
            <th className="py-2 font-medium">Serviço</th>
            <th className="py-2 font-medium">Referência</th>
            <th className="py-2 font-medium">Pagamento</th>
            <th className="py-2 font-medium">Nº / código</th>
            <th className="py-2 text-right font-medium">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-ink/10 divide-y">
          {recibo.itens.map((item, indice) => (
            <tr key={indice}>
              <td className="text-ink py-2">
                {ROTULOS_DE_SERVICO[item.servico]}
              </td>
              <td className="text-ink-muted py-2">{item.referencia ?? "—"}</td>
              <td className="text-ink-muted py-2">
                {ROTULOS_DE_FORMA_DO_RECIBO[item.formaDePagamento]}
              </td>
              <td className="text-ink-muted py-2">
                {item.referenciaDoPagamento ?? "—"}
              </td>
              <td className="text-ink py-2 text-right tabular-nums">
                {formatCurrency(item.valor)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-ink/20 border-t">
            <td colSpan={4} className="text-ink py-2 text-right font-medium">
              Total
            </td>
            <td className="text-ink py-2 text-right text-base font-semibold tabular-nums">
              {formatCurrency(totalDoRecibo(recibo.itens))}
            </td>
          </tr>
        </tfoot>
      </table>

      {recibo.observacoes && (
        <div className="mt-4">
          <p className="text-ink-muted text-xs">Observação</p>
          {/* `whitespace-pre-wrap`: o que foi escrito em linhas separadas
              continua em linhas separadas no papel. */}
          <p className="text-ink text-sm whitespace-pre-wrap">
            {recibo.observacoes}
          </p>
        </div>
      )}

      <div className="mt-10 flex justify-end">
        <div className="w-64 text-center">
          <div className="border-ink/40 border-t pt-1">
            <p className="text-ink text-sm">{recibo.emissorNome}</p>
            <p className="text-ink-muted text-xs">Colégio IBPI</p>
          </div>
        </div>
      </div>
    </article>
  );
}
