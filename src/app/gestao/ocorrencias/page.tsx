import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { formatDate } from "@/core/lib/format";
import { ROTULOS_DE_OCORRENCIA, type TipoDeOcorrencia } from "@/core/modelo";
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
import { ocorrenciasVisiveis } from "@/features/frequencia/services/frequencia.server";

export const metadata: Metadata = { title: "Ocorrências" };

export default async function OcorrenciasPage() {
  const sessao = await exigirPermissao("ocorrencias", "ler");
  const ocorrencias = await ocorrenciasVisiveis(sessao);

  const porTipo = new Map<string, number>();
  for (const ocorrencia of ocorrencias) {
    porTipo.set(ocorrencia.tipo, (porTipo.get(ocorrencia.tipo) ?? 0) + 1);
  }

  const maisComum = [...porTipo.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Ocorrências</h1>
        <p className="text-ink-muted mt-1 text-sm">
          {ocorrencias.length} registradas
          {maisComum
            ? ` · mais comum: ${ROTULOS_DE_OCORRENCIA[maisComum[0] as TipoDeOcorrencia]} (${maisComum[1]})`
            : ""}
        </p>
      </div>

      <Card>
        {ocorrencias.length === 0 ? (
          <EmptyState
            title="Nenhuma ocorrência registrada"
            description="As ocorrências marcadas na chamada aparecem aqui."
          />
        ) : (
          <Table caption="Ocorrências registradas">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Data</TableHeaderCell>
                <TableHeaderCell>Aluno</TableHeaderCell>
                <TableHeaderCell>Turma</TableHeaderCell>
                <TableHeaderCell>Tipo</TableHeaderCell>
                <TableHeaderCell>Descrição</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ocorrencias.map((ocorrencia) => (
                <TableRow key={ocorrencia.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatDate(ocorrencia.data)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/gestao/alunos/${ocorrencia.matricula}`}
                      className="text-brand-600 hover:underline"
                    >
                      {ocorrencia.nome ?? ocorrencia.matricula}
                    </Link>
                  </TableCell>
                  <TableCell>{ocorrencia.turmaCodigo ?? "—"}</TableCell>
                  <TableCell>
                    {ROTULOS_DE_OCORRENCIA[ocorrencia.tipo]}
                  </TableCell>
                  <TableCell className="text-ink-muted">
                    {ocorrencia.descricao}
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
