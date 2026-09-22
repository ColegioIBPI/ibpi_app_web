import Link from "next/link";

import { ROTULOS_DE_TURNO, type Turno } from "@/core/modelo";
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
import type { AlunoComId } from "@/features/alunos/services/alunos.server";

interface TabelaDeAlunosProps {
  alunos: AlunoComId[];
  /** `true` quando a lista está vazia por causa do filtro, não da base. */
  filtrada: boolean;
}

export function TabelaDeAlunos({ alunos, filtrada }: TabelaDeAlunosProps) {
  if (alunos.length === 0) {
    return filtrada ? (
      <EmptyState
        title="Nenhum aluno encontrado"
        description="Tente outro nome, matrícula ou turma."
      />
    ) : (
      <EmptyState
        title="Nenhum aluno cadastrado"
        description="Os alunos aparecem aqui depois da matrícula."
      />
    );
  }

  return (
    <Table caption="Alunos do colégio">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Aluno</TableHeaderCell>
          <TableHeaderCell>Matrícula</TableHeaderCell>
          <TableHeaderCell>Turma</TableHeaderCell>
          <TableHeaderCell>Turno</TableHeaderCell>
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
                <span className="text-ink-muted ml-2 text-xs">ex-aluno</span>
              )}
            </TableCell>
            <TableCell className="tabular-nums">{aluno.matricula}</TableCell>
            <TableCell>{aluno.turmaCodigo ?? "—"}</TableCell>
            <TableCell>
              {aluno.turno ? ROTULOS_DE_TURNO[aluno.turno as Turno] : "—"}
            </TableCell>
            <TableCell className="tabular-nums">
              {aluno.dataNascimento ? formatDate(aluno.dataNascimento) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
