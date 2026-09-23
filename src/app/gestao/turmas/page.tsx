import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { pode } from "@/core/auth/roles";
import { ROTULOS_DE_SEGMENTO, ROTULOS_DE_TURNO } from "@/core/modelo";
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
import { listarTurmas } from "@/features/turmas/services/turmas.server";

export const metadata: Metadata = { title: "Turmas" };

export default async function TurmasPage() {
  const sessao = await exigirPermissao("cadastros", "gerenciar");
  const turmas = await listarTurmas();

  const anos = [...new Set(turmas.map((t) => t.anoLetivo))].sort(
    (a, b) => b - a,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold">Turmas</h1>
          <p className="text-ink-muted mt-1 text-sm">
            {turmas.length} {turmas.length === 1 ? "turma" : "turmas"}
            {anos.length > 0 ? ` · ano letivo ${anos.join(", ")}` : ""}
          </p>
        </div>

        {pode(sessao.role, "cadastros", "gerenciar") && (
          <Link
            href="/gestao/turmas/nova"
            className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white"
          >
            <Plus className="size-4" aria-hidden />
            Nova turma
          </Link>
        )}
      </div>

      <Card>
        {turmas.length === 0 ? (
          <EmptyState
            title="Nenhuma turma cadastrada"
            description="Crie a primeira turma para começar a matricular alunos."
          />
        ) : (
          <Table caption="Turmas do colégio">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Turma</TableHeaderCell>
                <TableHeaderCell>Segmento</TableHeaderCell>
                <TableHeaderCell>Turno</TableHeaderCell>
                <TableHeaderCell>Ano</TableHeaderCell>
                <TableHeaderCell>Alunos</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {turmas.map((turma) => (
                <TableRow key={turma.id}>
                  <TableCell>
                    <Link
                      href={`/gestao/turmas/${turma.id}`}
                      className="text-brand-600 font-medium hover:underline"
                    >
                      {turma.codigo}
                    </Link>
                    {!turma.ativa && (
                      <span className="text-ink-muted ml-2 text-xs">
                        inativa
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{ROTULOS_DE_SEGMENTO[turma.segmento]}</TableCell>
                  <TableCell>{ROTULOS_DE_TURNO[turma.turno]}</TableCell>
                  <TableCell className="tabular-nums">
                    {turma.anoLetivo}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {turma.totalDeAlunos}
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
