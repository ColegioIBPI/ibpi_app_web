"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { formatDate } from "@/core/lib/format";
import type { Boletim } from "@/core/modelo";
import { Button } from "@/core/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/core/ui/table";
import {
  liberarTrimestre,
  liberarTurma,
} from "@/features/notas/actions/liberacao";
import {
  estaLiberado,
  quemLiberou,
  TRIMESTRES,
} from "@/features/notas/domain/liberacao";

export interface AlunoParaLiberar {
  matricula: string;
  nome: string;
  turmaCodigo: string | null;
  liberacoes: Boletim["liberacoes"];
}

/**
 * Um check por trimestre, por aluno.
 *
 * Enquanto a caixa está desmarcada, a família **não recebe** as notas
 * daquele trimestre — nem no Portal, nem no aplicativo. O recorte é feito
 * no servidor e na regra do Firestore; esta tela só decide.
 *
 * A caixa só muda quando o servidor confirma. Liberar nota é um ato
 * visível para a família na hora seguinte, e mostrar "liberado" por um
 * instante antes de a gravação passar é o tipo de engano que faz alguém
 * avisar a turma antes da hora.
 */
export function LiberacaoDeBoletins({
  anoLetivo,
  alunos,
}: {
  anoLetivo: number;
  alunos: AlunoParaLiberar[];
}) {
  const router = useRouter();

  const [gravando, setGravando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function executar(
    chave: string,
    acao: () => Promise<{ ok: boolean; erro?: string }>,
  ) {
    setErro(null);
    setGravando(chave);

    try {
      const resultado = await acao();

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível alterar a liberação.");
        return;
      }

      router.refresh();
    } finally {
      setGravando(null);
    }
  }

  /** Quantos alunos desta lista já têm o trimestre liberado. */
  function liberadosNo(trimestre: string): number {
    return alunos.filter((aluno) => estaLiberado(aluno, trimestre)).length;
  }

  return (
    <div className="flex flex-col gap-4">
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-muted text-sm">Liberar a lista inteira:</span>
        {TRIMESTRES.map((trimestre) => {
          const jaLiberados = liberadosNo(trimestre);
          const todos = jaLiberados === alunos.length && alunos.length > 0;

          return (
            <Button
              key={trimestre}
              variant="secondary"
              size="sm"
              loading={gravando === `turma-${trimestre}`}
              disabled={gravando !== null || alunos.length === 0}
              onClick={() =>
                executar(`turma-${trimestre}`, () =>
                  liberarTurma({
                    anoLetivo,
                    matriculas: alunos.map((aluno) => aluno.matricula),
                    trimestre,
                    liberar: !todos,
                  }),
                )
              }
            >
              {todos ? `Recolher ${trimestre}º` : `Liberar ${trimestre}º`}
              <span className="text-ink-muted">
                ({jaLiberados}/{alunos.length})
              </span>
            </Button>
          );
        })}
      </div>

      <Table caption="Liberação do boletim por aluno e trimestre">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Aluno</TableHeaderCell>
            <TableHeaderCell>Turma</TableHeaderCell>
            {TRIMESTRES.map((trimestre) => (
              <TableHeaderCell key={trimestre} className="text-center">
                {trimestre}º tri
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {alunos.map((aluno) => (
            <TableRow key={aluno.matricula}>
              <TableCell>
                <Link
                  href={`/gestao/boletins/${aluno.matricula}`}
                  className="text-brand-600 font-medium hover:underline"
                >
                  {aluno.nome}
                </Link>
                <span className="text-ink-muted block text-xs">
                  {aluno.matricula}
                </span>
              </TableCell>

              <TableCell className="text-ink-muted">
                {aluno.turmaCodigo ?? "—"}
              </TableCell>

              {TRIMESTRES.map((trimestre) => {
                const liberado = estaLiberado(aluno, trimestre);
                const quem = quemLiberou(aluno, trimestre);
                const chave = `${aluno.matricula}-${trimestre}`;

                return (
                  <TableCell key={trimestre} className="text-center">
                    <label className="inline-flex flex-col items-center gap-0.5">
                      <input
                        type="checkbox"
                        aria-label={`Liberar o ${trimestre}º trimestre de ${aluno.nome}`}
                        className="border-line size-4 rounded"
                        checked={liberado}
                        disabled={gravando !== null}
                        onChange={(evento) =>
                          executar(chave, () =>
                            liberarTrimestre({
                              anoLetivo,
                              matricula: aluno.matricula,
                              trimestre,
                              liberar: evento.target.checked,
                            }),
                          )
                        }
                      />
                      {/* Quem liberou e quando: é a resposta para "desde
                          quando essa nota estava no ar". */}
                      {quem && (
                        <span
                          className="text-ink-muted text-[10px]"
                          title={`Liberado por ${quem.porNome}`}
                        >
                          {formatDate(quem.em)}
                        </span>
                      )}
                    </label>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-ink-muted text-xs">
        Enquanto a caixa está desmarcada, a família não recebe as notas daquele
        trimestre — nem no Portal, nem no aplicativo. Recolher um trimestre já
        liberado volta a escondê-lo.
      </p>
    </div>
  );
}
