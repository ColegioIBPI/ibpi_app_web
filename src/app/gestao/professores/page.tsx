import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
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
import { filtrarProfessores } from "@/features/professores/domain/alocacoes";
import { listarProfessores } from "@/features/professores/services/professores.server";

export const metadata: Metadata = { title: "Professores" };

export default async function ProfessoresPage({
  searchParams,
}: PageProps<"/gestao/professores">) {
  await exigirPermissao("cadastros", "gerenciar");
  const filtros = await searchParams;

  const todos = await listarProfessores();
  const encontrados = filtrarProfessores(todos, {
    termo: typeof filtros.q === "string" ? filtros.q : undefined,
    situacao: filtros.situacao === "todos" ? "todos" : "ativos",
  });

  const semTurma = todos.filter(
    (p) => p.ativo && (p.turmas ?? []).length === 0,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold">Professores</h1>
          <p className="text-ink-muted mt-1 text-sm">
            {encontrados.length} {encontrados.length === 1 ? "ativo" : "ativos"}
            {semTurma > 0 ? ` · ${semTurma} sem turma alocada` : ""}
          </p>
        </div>

        <Link
          href="/gestao/professores/novo"
          className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white"
        >
          <Plus className="size-4" aria-hidden />
          Novo professor
        </Link>
      </div>

      <Card>
        {encontrados.length === 0 ? (
          <EmptyState
            title="Nenhum professor cadastrado"
            description="O sistema antigo não tinha professores cadastrados — o cadastro começa aqui."
          />
        ) : (
          <Table caption="Professores do colégio">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Professor</TableHeaderCell>
                <TableHeaderCell>E-mail</TableHeaderCell>
                <TableHeaderCell>Turmas</TableHeaderCell>
                <TableHeaderCell>Acesso</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {encontrados.map((professor) => (
                <TableRow key={professor.id}>
                  <TableCell>
                    <Link
                      href={`/gestao/professores/${professor.id}`}
                      className="text-brand-600 font-medium hover:underline"
                    >
                      {professor.nome}
                    </Link>
                    {!professor.ativo && (
                      <span className="text-ink-muted ml-2 text-xs">
                        inativo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="break-all">
                    {professor.email ?? "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {(professor.turmas ?? []).length}
                  </TableCell>
                  <TableCell>
                    {professor.uid ? (
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
      </Card>
    </div>
  );
}
