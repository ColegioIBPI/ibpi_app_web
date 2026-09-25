import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { descreverDestino, ROTULOS_DE_INFORMACAO } from "@/core/modelo";
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
import { listarInformacoesPublicadas } from "@/features/informacoes/services/informacoes.server";

export const metadata: Metadata = { title: "Informações úteis" };

export default async function InformacoesPage() {
  await exigirPermissao("avisos", "gerenciar");
  const informacoes = await listarInformacoesPublicadas();

  const ativas = informacoes.filter((informacao) => informacao.ativo).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold">Informações úteis</h1>
          <p className="text-ink-muted mt-1 text-sm">
            {informacoes.length} cadastradas · {ativas} no ar
          </p>
        </div>

        <Link
          href="/gestao/informacoes/novo"
          className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white"
        >
          <Plus className="size-4" aria-hidden />
          Nova informação
        </Link>
      </div>

      <Card>
        {informacoes.length === 0 ? (
          <EmptyState
            title="Nenhuma informação cadastrada"
            description="Publique o calendário, os horários e os documentos do colégio."
          />
        ) : (
          <Table caption="Informações úteis cadastradas">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Título</TableHeaderCell>
                <TableHeaderCell>Tipo</TableHeaderCell>
                <TableHeaderCell>Para quem</TableHeaderCell>
                <TableHeaderCell>Ordem</TableHeaderCell>
                <TableHeaderCell>Situação</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {informacoes.map((informacao) => (
                <TableRow key={informacao.id}>
                  <TableCell>
                    <Link
                      href={`/gestao/informacoes/${informacao.id}`}
                      className="text-brand-600 font-medium hover:underline"
                    >
                      {informacao.titulo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {ROTULOS_DE_INFORMACAO[informacao.tipo]}
                  </TableCell>
                  <TableCell>{descreverDestino(informacao.destino)}</TableCell>
                  <TableCell className="tabular-nums">
                    {informacao.ordem}
                  </TableCell>
                  <TableCell>
                    {informacao.ativo ? (
                      <span className="text-success">No ar</span>
                    ) : (
                      <span className="text-ink-muted">Fora do ar</span>
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
