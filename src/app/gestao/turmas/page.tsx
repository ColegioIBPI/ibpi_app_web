import { CalendarPlus, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { pode } from "@/core/auth/roles";
import { anoLetivoEscolhido } from "@/core/escola/ano-letivo.server";
import { ROTULOS_DE_TURNO } from "@/core/modelo";
import { rotuloDoCurso } from "@/features/cursos/domain/curso";
import { listarCursos } from "@/features/cursos/services/cursos.server";
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

  /*
    As turmas são **do ano selecionado**. A tela mostrava todos os anos
    de uma vez, com `EM1A` repetida uma vez por ano: dava para clicar na
    de 2026 achando que era a de 2027, e lançar nota no ano errado.
  */
  const anoLetivo = await anoLetivoEscolhido();
  const [turmas, cursos] = await Promise.all([
    listarTurmas(anoLetivo),
    listarCursos(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-ink text-xl font-semibold">Turmas</h1>
          <p className="text-ink-muted mt-1 text-sm">
            {turmas.length} {turmas.length === 1 ? "turma" : "turmas"} · ano
            letivo {anoLetivo}
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
            title={`Nenhuma turma em ${anoLetivo}`}
            description={`As turmas de ${anoLetivo - 1} podem ser copiadas para ${anoLetivo} de uma vez, ou você cria a primeira à mão em "Nova turma".`}
          >
            <Link
              href={`/gestao/configuracoes/abertura?de=${anoLetivo - 1}`}
              className="border-line bg-surface text-ink hover:bg-surface-subtle mt-2 inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium"
            >
              <CalendarPlus className="size-4" aria-hidden />
              Copiar as turmas de {anoLetivo - 1}
            </Link>
          </EmptyState>
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
                  <TableCell>{rotuloDoCurso(turma.segmento, cursos)}</TableCell>
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
