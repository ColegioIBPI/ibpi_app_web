import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
import { formatDate } from "@/core/lib/format";
import {
  listarAlunosDaTurma,
  obterTurma,
} from "@/features/turmas/services/turmas.server";

export async function generateMetadata({
  params,
}: PageProps<"/gestao/turmas/[id]">): Promise<Metadata> {
  const { id } = await params;
  const turma = await obterTurma(id);
  return { title: turma ? `Turma ${turma.codigo}` : "Turma" };
}

export default async function TurmaPage({
  params,
}: PageProps<"/gestao/turmas/[id]">) {
  const sessao = await exigirPermissao("cadastros", "ler");
  const { id } = await params;

  const turma = await obterTurma(id);
  if (!turma) notFound();

  const alunos = await listarAlunosDaTurma(sessao, id);
  const podeEditar = pode(sessao.role, "cadastros", "gerenciar");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/gestao/turmas"
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Turmas
          </Link>

          <h1 className="text-ink mt-2 text-xl font-semibold">
            {turma.codigo}
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            {ROTULOS_DE_SEGMENTO[turma.segmento]} ·{" "}
            {ROTULOS_DE_TURNO[turma.turno]} · {turma.anoLetivo}
            {turma.ativa ? "" : " · inativa"}
          </p>
        </div>

        {podeEditar && (
          <Link
            href={`/gestao/turmas/${turma.id}/editar`}
            className="border-line text-ink hover:bg-surface-subtle inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium"
          >
            <Pencil className="size-4" aria-hidden />
            Editar
          </Link>
        )}
      </div>

      <Card
        title="Alunos"
        description={`${alunos.length} ${alunos.length === 1 ? "matriculado" : "matriculados"}`}
      >
        {alunos.length === 0 ? (
          <EmptyState
            title="Nenhum aluno nesta turma"
            description="Os alunos aparecem aqui conforme forem matriculados."
          />
        ) : (
          <Table caption={`Alunos da turma ${turma.codigo}`}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Aluno</TableHeaderCell>
                <TableHeaderCell>Matrícula</TableHeaderCell>
                <TableHeaderCell>Nascimento</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alunos.map((aluno) => (
                <TableRow key={aluno.id}>
                  <TableCell>
                    <Link
                      href={`/gestao/alunos/${aluno.matricula}`}
                      className="text-brand-600 font-medium hover:underline"
                    >
                      {aluno.nome}
                    </Link>
                    {!aluno.ativo && (
                      <span className="text-ink-muted ml-2 text-xs">
                        ex-aluno
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {aluno.matricula}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {aluno.dataNascimento
                      ? formatDate(aluno.dataNascimento)
                      : "—"}
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
