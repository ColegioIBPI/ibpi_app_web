import Link from "next/link";

import { formatCurrency, formatDate } from "@/core/lib/format";
import { ROTULOS_DE_STATUS_DO_RECIBO, type ReciboComId } from "@/core/modelo";
import { EmptyState } from "@/core/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/core/ui/table";
import { totalDoRecibo } from "@/features/recibos/domain/recibo";

/**
 * Os recibos emitidos.
 *
 * Ordenada pela emissão mais recente, que é o que se procura no dia a dia.
 * O cancelado continua na lista, riscado: sumir com ele esconderia
 * justamente o buraco na numeração que alguém vai querer explicar.
 */
export function ListaDeRecibos({ recibos }: { recibos: ReciboComId[] }) {
  if (recibos.length === 0) {
    return (
      <EmptyState
        title="Nenhum recibo"
        description="Os recibos emitidos aparecem aqui, do mais recente para o mais antigo."
      />
    );
  }

  return (
    <Table caption="Recibos emitidos">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Recibo</TableHeaderCell>
          <TableHeaderCell>Emissão</TableHeaderCell>
          <TableHeaderCell>Aluno</TableHeaderCell>
          <TableHeaderCell>Emissor</TableHeaderCell>
          <TableHeaderCell className="text-right">Total</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {recibos.map((recibo) => {
          const cancelado = recibo.status === "cancelado";

          return (
            <TableRow key={recibo.id}>
              <TableCell>
                <Link
                  href={`/gestao/recibos/${recibo.id}`}
                  className="text-brand-600 font-medium hover:underline"
                >
                  {recibo.serie} · nº {recibo.numero}
                </Link>
              </TableCell>
              <TableCell className="text-ink-muted">
                {formatDate(recibo.emitidoEm)}
              </TableCell>
              <TableCell>
                {recibo.aluno.nome}
                <span className="text-ink-muted block text-xs">
                  {recibo.aluno.matricula}
                </span>
              </TableCell>
              <TableCell className="text-ink-muted">
                {recibo.emissorNome}
              </TableCell>
              <TableCell
                className={
                  cancelado
                    ? "text-ink-muted text-right tabular-nums line-through"
                    : "text-right tabular-nums"
                }
              >
                {formatCurrency(totalDoRecibo(recibo.itens))}
              </TableCell>
              <TableCell>
                <span
                  className={
                    cancelado
                      ? "text-danger text-xs font-medium"
                      : "text-success text-xs font-medium"
                  }
                >
                  {ROTULOS_DE_STATUS_DO_RECIBO[recibo.status]}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
