import type { Metadata } from "next";

import { exigirPermissao } from "@/core/auth/guards";
import { formatDate } from "@/core/lib/format";
import { ROTULOS_DE_OCORRENCIA } from "@/core/modelo";
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

/**
 * Ocorrências para o responsável.
 *
 * O perfil aluno não chega aqui: a rota exige permissão em `ocorrencias`, e
 * ele não tem. A ocorrência disciplinar é tratada com o responsável e a
 * equipe escolar.
 */
export default async function OcorrenciasDoPortalPage() {
  const sessao = await exigirPermissao("ocorrencias", "ler");
  const ocorrencias = await ocorrenciasVisiveis(sessao);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Ocorrências</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Registros da equipe escolar sobre seus filhos.
        </p>
      </div>

      <Card>
        {ocorrencias.length === 0 ? (
          <EmptyState
            title="Nenhuma ocorrência registrada"
            description="Nada a relatar até aqui."
          />
        ) : (
          <Table caption="Ocorrências dos seus filhos">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Data</TableHeaderCell>
                <TableHeaderCell>Aluno</TableHeaderCell>
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
                    {ocorrencia.nome ?? ocorrencia.matricula}
                  </TableCell>
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
