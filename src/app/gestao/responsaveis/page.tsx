import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { exigirPermissao } from "@/core/auth/guards";
import { Card } from "@/core/ui/card";
import { EmptyState, LoadingState } from "@/core/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/core/ui/table";
import { FiltrosDeResponsaveis } from "@/features/responsaveis/components/filtros";
import {
  filtrarResponsaveis,
  ordenarPorNome,
  temConta,
  type FiltroDeAcesso,
} from "@/features/responsaveis/domain/busca";
import { listarResponsaveis } from "@/features/responsaveis/services/responsaveis.server";

export const metadata: Metadata = { title: "Responsáveis" };

export default async function ResponsaveisPage({
  searchParams,
}: PageProps<"/gestao/responsaveis">) {
  await exigirPermissao("cadastros", "gerenciar");
  const filtros = await searchParams;

  const todos = await listarResponsaveis();
  const encontrados = ordenarPorNome(
    filtrarResponsaveis(todos, {
      termo: typeof filtros.q === "string" ? filtros.q : undefined,
      acesso: acesso(filtros.acesso),
    }),
  );

  const comAcesso = todos.filter(temConta).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold">Responsáveis</h1>
          <p className="text-ink-muted mt-1 text-sm">
            {encontrados.length === todos.length
              ? `${todos.length} cadastrados`
              : `${encontrados.length} de ${todos.length}`}
            {` · ${comAcesso} com acesso ao Portal`}
          </p>
        </div>

        <Link
          href="/gestao/responsaveis/novo"
          className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white"
        >
          <Plus className="size-4" aria-hidden />
          Novo responsável
        </Link>
      </div>

      <Card>
        <Suspense fallback={<LoadingState title="Carregando filtros…" />}>
          <FiltrosDeResponsaveis />
        </Suspense>

        <div className="mt-6">
          {encontrados.length === 0 ? (
            <EmptyState
              title="Nenhum responsável encontrado"
              description="Tente outro nome ou e-mail."
            />
          ) : (
            <Table caption="Responsáveis cadastrados">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Responsável</TableHeaderCell>
                  <TableHeaderCell>E-mail</TableHeaderCell>
                  <TableHeaderCell>Alunos</TableHeaderCell>
                  <TableHeaderCell>Acesso</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {encontrados.map((responsavel) => (
                  <TableRow key={responsavel.id}>
                    <TableCell>
                      <Link
                        href={`/gestao/responsaveis/${responsavel.id}`}
                        className="text-brand-600 font-medium hover:underline"
                      >
                        {responsavel.nome}
                      </Link>
                      {responsavel.parentesco && (
                        <span className="text-ink-muted ml-2 text-xs">
                          {responsavel.parentesco}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="break-all">
                      {responsavel.email ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {responsavel.alunosVinculados.length}
                    </TableCell>
                    <TableCell>
                      {temConta(responsavel) ? (
                        <span className="text-success">Ativo</span>
                      ) : (
                        <span className="text-ink-muted">Sem acesso</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}

function acesso(valor: string | string[] | undefined): FiltroDeAcesso {
  return valor === "com-conta" || valor === "sem-conta" || valor === "sem-filho"
    ? valor
    : "todos";
}
