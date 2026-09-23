import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { descreverDestino } from "@/core/modelo";
import { formatDate } from "@/core/lib/format";
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
import { listarAvisosPublicados } from "@/features/avisos/services/avisos.server";

export const metadata: Metadata = { title: "Avisos" };

export default async function AvisosPage() {
  await exigirPermissao("avisos", "lancar");
  const avisos = await listarAvisosPublicados();

  const ativos = avisos.filter((aviso) => aviso.ativo).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold">Avisos</h1>
          <p className="text-ink-muted mt-1 text-sm">
            {avisos.length} publicados · {ativos} no ar
          </p>
        </div>

        <Link
          href="/gestao/avisos/novo"
          className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white"
        >
          <Plus className="size-4" aria-hidden />
          Novo aviso
        </Link>
      </div>

      <Card>
        {avisos.length === 0 ? (
          <EmptyState
            title="Nenhum aviso publicado"
            description="Publique o primeiro para a comunidade escolar."
          />
        ) : (
          <Table caption="Avisos publicados">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Aviso</TableHeaderCell>
                <TableHeaderCell>Para quem</TableHeaderCell>
                <TableHeaderCell>Publicado por</TableHeaderCell>
                <TableHeaderCell>Data</TableHeaderCell>
                <TableHeaderCell>Situação</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {avisos.map((aviso) => (
                <TableRow key={aviso.id}>
                  <TableCell>
                    <Link
                      href={`/gestao/avisos/${aviso.id}`}
                      className="text-brand-600 font-medium hover:underline"
                    >
                      {aviso.titulo}
                    </Link>
                    {aviso.anexos.length > 0 && (
                      <span className="text-ink-muted ml-2 text-xs">
                        {aviso.anexos.length}{" "}
                        {aviso.anexos.length === 1 ? "anexo" : "anexos"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{descreverDestino(aviso.destino)}</TableCell>
                  <TableCell>{aviso.publicadoPorNome ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatDate(aviso.publicadoEm)}
                  </TableCell>
                  <TableCell>
                    {aviso.ativo ? (
                      <span className="text-success">No ar</span>
                    ) : (
                      <span className="text-ink-muted">Despublicado</span>
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
