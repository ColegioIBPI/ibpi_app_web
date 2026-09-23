import type { Metadata } from "next";

import { exigirArea } from "@/core/auth/guards";
import { formatDate, formatPercent } from "@/core/lib/format";
import {
  COLECOES,
  ROTULOS_DE_OCORRENCIA,
  ROTULOS_DE_PRESENCA,
  type Aluno,
} from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";
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
import {
  percentualDePresenca,
  ROTULOS_DE_FREQUENCIA,
  situacaoPorFrequencia,
} from "@/features/frequencia/domain/calculos";
import { frequenciaDoAluno } from "@/features/frequencia/services/frequencia.server";

export const metadata: Metadata = { title: "Frequência" };

export default async function FrequenciaDoPortalPage() {
  const sessao = await exigirArea("consulta");

  const matriculas =
    sessao.role === "aluno"
      ? sessao.matricula
        ? [sessao.matricula]
        : []
      : sessao.alunosVinculados;

  if (matriculas.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Nenhum aluno vinculado"
          description="Fale com a secretaria para vincular o seu acesso."
        />
      </Card>
    );
  }

  const db = getAdminDb();

  const fichas = await Promise.all(
    matriculas.map(async (matricula) => {
      const [alunoDoc, frequencia] = await Promise.all([
        db.collection(COLECOES.alunos).doc(matricula).get(),
        frequenciaDoAluno(matricula),
      ]);

      const aluno = alunoDoc.data() as Aluno | undefined;
      const percentual = percentualDePresenca(frequencia.contadores);

      return {
        matricula,
        nome: aluno?.nome ?? matricula,
        turma: aluno?.turmaCodigo ?? null,
        percentual,
        situacao: situacaoPorFrequencia(percentual),
        ...frequencia,
      };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Frequência</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Presenças, faltas e atrasos registrados pelo colégio.
        </p>
      </div>

      {fichas.map((ficha) => (
        <Card
          key={ficha.matricula}
          title={ficha.nome}
          description={ficha.turma ? `Turma ${ficha.turma}` : undefined}
        >
          <div className="text-ink-muted mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span>
              Presença:{" "}
              <strong className="text-ink">
                {ficha.percentual === null
                  ? "—"
                  : formatPercent(ficha.percentual)}
              </strong>
            </span>
            <span className="text-success">
              {ficha.contadores.presencas} presenças
            </span>
            <span className="text-danger">
              {ficha.contadores.faltas} faltas
            </span>
            <span className="text-warning">
              {ficha.contadores.atrasos} atrasos
            </span>
          </div>

          {ficha.situacao !== "regular" && (
            <p
              className={
                ficha.situacao === "reprovado"
                  ? "border-danger bg-danger-surface text-danger mb-4 rounded-md border px-3 py-2 text-sm"
                  : "border-warning bg-warning-surface text-warning mb-4 rounded-md border px-3 py-2 text-sm"
              }
            >
              {ROTULOS_DE_FREQUENCIA[ficha.situacao]}. O mínimo exigido é 75% de
              presença.
            </p>
          )}

          {ficha.lancamentos.length === 0 ? (
            <EmptyState
              title="Nada registrado ainda"
              description="As faltas e os atrasos aparecem aqui conforme o colégio registra."
            />
          ) : (
            <Table caption={`Frequência de ${ficha.nome}`}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Data</TableHeaderCell>
                  <TableHeaderCell>Situação</TableHeaderCell>
                  <TableHeaderCell>Ocorrência</TableHeaderCell>
                  <TableHeaderCell>Observação</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ficha.lancamentos.map((lancamento) => (
                  <TableRow key={lancamento.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDate(lancamento.data)}
                    </TableCell>
                    <TableCell>
                      {ROTULOS_DE_PRESENCA[lancamento.situacao]}
                    </TableCell>
                    <TableCell>
                      {lancamento.ocorrencia
                        ? ROTULOS_DE_OCORRENCIA[lancamento.ocorrencia]
                        : "—"}
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      {lancamento.observacao ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      ))}
    </div>
  );
}
