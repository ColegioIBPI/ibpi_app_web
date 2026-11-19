import { CalendarPlus } from "lucide-react";
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
import { FotoDoAluno } from "@/features/alunos/components/foto-do-aluno";
import type { AlunoComId } from "@/features/alunos/services/alunos.server";

interface TabelaDeAlunosProps {
  alunos: AlunoComId[];
  /** `true` quando a lista está vazia por causa do filtro, não da base. */
  filtrada: boolean;
  /** O ano da lista, para o vazio dizer de que ano ele está falando. */
  anoLetivo?: number;
}

export function TabelaDeAlunos({
  alunos,
  filtrada,
  anoLetivo,
}: TabelaDeAlunosProps) {
  if (alunos.length === 0) {
    return filtrada ? (
      <EmptyState
        title="Nenhum aluno encontrado"
        description="Tente outro nome, matrícula ou turma."
      />
    ) : (
      /*
        Ano aberto e ainda sem ninguém é o estado normal de quem acabou
        de criar o ano novo — e é aí que a secretaria precisa saber qual
        é o próximo passo, em vez de concluir que perdeu os alunos.

        O botão leva à abertura **já com o ano de origem certo**: mandar
        para "Configurações" e deixar a pessoa achar o caminho foi
        exatamente o que fez alguém abrir a tela e encontrar o ano
        seguinte ao que queria.
      */
      <EmptyState
        title={
          anoLetivo ? `Nenhum aluno em ${anoLetivo}` : "Nenhum aluno cadastrado"
        }
        description={
          anoLetivo
            ? `Os alunos de ${anoLetivo - 1} entram em ${anoLetivo} pela abertura do ano letivo. Um aluno novo entra por "Novo aluno".`
            : "Os alunos aparecem aqui depois da matrícula."
        }
      >
        {anoLetivo && (
          <Link
            href={`/gestao/configuracoes/abertura?de=${anoLetivo - 1}`}
            className="border-line bg-surface text-ink hover:bg-surface-subtle mt-2 inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium"
          >
            <CalendarPlus className="size-4" aria-hidden />
            Passar os alunos de {anoLetivo - 1} para {anoLetivo}
          </Link>
        )}
      </EmptyState>
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
              <div className="flex items-center gap-3">
                <FotoDoAluno
                  matricula={aluno.matricula}
                  nome={aluno.nome}
                  fotoPath={aluno.fotoPath}
                  fotoAtualizadaEm={aluno.fotoAtualizadaEm}
                  tamanho={32}
                />
                <div>
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
                </div>
              </div>
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
