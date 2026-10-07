import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { formatCurrency } from "@/core/lib/format";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/core/ui/table";
import { listarDocumentos } from "@/features/documentos/services/documentos.server";

export const metadata: Metadata = { title: "Documentos" };

export default async function DocumentosPage() {
  await exigirPermissao("cadastros", "gerenciar");
  const documentos = await listarDocumentos();

  const disponiveis = documentos.filter((documento) => documento.ativo).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold">Documentos</h1>
          <p className="text-ink-muted mt-1 text-sm">
            {documentos.length} cadastrados · {disponiveis} na lista da família
          </p>
        </div>

        <Link
          href="/gestao/documentos/novo"
          className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white"
        >
          <Plus className="size-4" aria-hidden />
          Novo documento
        </Link>
      </div>

      <Card>
        {documentos.length === 0 ? (
          <EmptyState
            title="Nenhum documento cadastrado"
            description="Cadastre as declarações que a secretaria emite — é a lista de onde a família escolhe ao fazer um pedido."
          />
        ) : (
          <Table caption="Documentos que a secretaria emite">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Documento</TableHeaderCell>
                <TableHeaderCell>Prazo</TableHeaderCell>
                <TableHeaderCell>Valor</TableHeaderCell>
                <TableHeaderCell>Comprovante</TableHeaderCell>
                <TableHeaderCell>Ordem</TableHeaderCell>
                <TableHeaderCell>Situação</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documentos.map((documento) => (
                <TableRow key={documento.id}>
                  <TableCell>
                    <Link
                      href={`/gestao/documentos/${documento.id}`}
                      className="text-brand-600 font-medium hover:underline"
                    >
                      {documento.nome}
                    </Link>
                    {documento.descricao && (
                      <span className="text-ink-muted block text-xs">
                        {documento.descricao}
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap tabular-nums">
                    {documento.prazoEmDiasUteis === null ||
                    documento.prazoEmDiasUteis === undefined
                      ? "—"
                      : `${documento.prazoEmDiasUteis} ${
                          documento.prazoEmDiasUteis === 1
                            ? "dia útil"
                            : "dias úteis"
                        }`}
                  </TableCell>

                  <TableCell className="tabular-nums">
                    {documento.valor === null || documento.valor === undefined
                      ? "Gratuito"
                      : formatCurrency(documento.valor)}
                  </TableCell>

                  <TableCell>
                    {documento.exigeComprovante ? "Obrigatório" : "—"}
                  </TableCell>

                  <TableCell className="tabular-nums">
                    {documento.ordem}
                  </TableCell>

                  <TableCell>
                    {documento.ativo ? (
                      <span className="text-success">Na lista</span>
                    ) : (
                      <span className="text-ink-muted">Fora da lista</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
