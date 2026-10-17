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
 * Ocorrências para a família.
 *
 * O responsável lê as dos filhos; **o aluno, só as que a escola marcou
 * para ele** — o padrão continua sendo tratar a ocorrência disciplinar com
 * o adulto, e o recorte é feito em `ocorrenciasVisiveis`.
 *
 * A lista nunca diz que existe algo retido. "Há uma ocorrência que você
 * não pode ver" é pior que silêncio: entrega o fato sem o contexto, que é
 * justamente o que a retenção quis evitar.
 */
export default async function OcorrenciasDoPortalPage() {
  const sessao = await exigirPermissao("ocorrencias", "ler");
  const ocorrencias = await ocorrenciasVisiveis(sessao);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Ocorrências</h1>
        <p className="text-ink-muted mt-1 text-sm">
          {sessao.role === "aluno"
            ? "Registros da equipe escolar sobre você."
            : "Registros da equipe escolar sobre seus filhos."}
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
