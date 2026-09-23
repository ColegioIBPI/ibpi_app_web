"use client";

import { CalendarPlus, ChevronDown, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatDate, formatPercent, formatShortDate } from "@/core/lib/format";
import type { Aula, Trimestre } from "@/core/modelo";
import { cn } from "@/core/lib/cn";
import { Button } from "@/core/ui/button";
import { SelectField, TextField } from "@/core/ui/field";
import { EmptyState } from "@/core/ui/states";
import {
  registrarAula,
  registrarChamadaDaAula,
  registrarConteudo,
  removerAula,
} from "@/features/diario/actions/diario";
import {
  aulasSemConteudo,
  faltasNaDisciplina,
  ordenarAulas,
  percentualNaDisciplina,
  ROTULOS_SEM_AULA,
  type MotivoSemAula,
} from "@/core/escola/aulas";
import type { AlunoDaTurma } from "@/core/escola/alocacoes.server";

interface GradeProps {
  alocacaoId: string;
  trimestre: Trimestre;
  aulas: Aula[];
  alunos: AlunoDaTurma[];
}

/**
 * Grade de aulas do trimestre.
 *
 * A pauta impressa é uma tabela de alunos × aulas, que na tela viraria uma
 * matriz ilegível em qualquer aparelho menor que um monitor. Aqui cada aula
 * é uma linha que abre a chamada daquele dia — que é como o professor
 * trabalha: uma aula por vez, no momento em que ela acontece.
 */
export function GradeDeAulas({
  alocacaoId,
  trimestre,
  aulas,
  alunos,
}: GradeProps) {
  const router = useRouter();
  const [aberta, setAberta] = useState<number | null>(null);
  const [novaData, setNovaData] = useState("");
  const [semAula, setSemAula] = useState<MotivoSemAula | "">("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const ordenadas = ordenarAulas(aulas);
  const pendentes = aulasSemConteudo(aulas);

  async function executar(chave: string, acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null);
    setOcupado(chave);

    try {
      const resultado = await acao();
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar.");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setOcupado(null);
    }
  }

  async function adicionar() {
    if (!novaData) {
      setErro("Escolha a data da aula.");
      return;
    }

    const ok = await executar("nova", () =>
      registrarAula({
        alocacaoId,
        trimestre,
        data: novaData,
        conteudo: "",
        semAula: semAula || null,
      }),
    );

    if (ok) {
      setNovaData("");
      setSemAula("");
    }
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

      {pendentes.length > 0 && (
        <p className="border-warning bg-warning-surface text-warning rounded-md border px-3 py-2 text-sm">
          {pendentes.length === 1
            ? `A aula ${pendentes[0]} ainda está sem conteúdo registrado.`
            : `${pendentes.length} aulas ainda estão sem conteúdo: ${pendentes.join(", ")}.`}
        </p>
      )}

      {ordenadas.length === 0 ? (
        <EmptyState
          title="Nenhuma aula registrada"
          description="Registre a primeira aula do trimestre abaixo."
        />
      ) : (
        <div className="border-line divide-line divide-y rounded-md border">
          {ordenadas.map((aula) => {
            const faltas = Object.values(aula.presencas ?? {}).filter(
              (v) => v === false,
            ).length;
            const estaAberta = aberta === aula.numero;

            return (
              <div key={aula.numero}>
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <button
                    type="button"
                    onClick={() =>
                      setAberta(estaAberta ? null : aula.numero)
                    }
                    aria-expanded={estaAberta}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <ChevronDown
                      className={cn(
                        "text-ink-muted size-4 shrink-0 transition-transform",
                        estaAberta && "rotate-180",
                      )}
                      aria-hidden
                    />
                    <span className="text-ink text-sm font-medium tabular-nums">
                      Aula {aula.numero}
                    </span>
                    <span className="text-ink-muted text-sm tabular-nums">
                      {formatDate(aula.data)}
                    </span>

                    {aula.semAula ? (
                      <span className="text-ink-muted text-xs">
                        {ROTULOS_SEM_AULA[aula.semAula]} — não conta na
                        frequência
                      </span>
                    ) : (
                      <span className="text-ink-muted text-xs">
                        {faltas === 0
                          ? "sem faltas"
                          : `${faltas} ${faltas === 1 ? "falta" : "faltas"}`}
                        {aula.conteudo?.trim() ? "" : " · sem conteúdo"}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    aria-label={`Remover aula ${aula.numero}`}
                    onClick={() =>
                      executar(`remover-${aula.numero}`, () =>
                        removerAula({
                          alocacaoId,
                          trimestre,
                          numero: aula.numero,
                        }),
                      )
                    }
                    disabled={ocupado === `remover-${aula.numero}`}
                    className="text-ink-muted hover:text-danger shrink-0 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>

                {estaAberta && (
                  <DetalheDaAula
                    alocacaoId={alocacaoId}
                    trimestre={trimestre}
                    aula={aula}
                    alunos={alunos}
                    ocupado={ocupado}
                    executar={executar}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="border-line grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <TextField
          label="Data da aula"
          type="date"
          value={novaData}
          onChange={(evento) => setNovaData(evento.target.value)}
        />

        <SelectField
          label="Tipo"
          value={semAula}
          onChange={(evento) =>
            setSemAula(evento.target.value as MotivoSemAula | "")
          }
        >
          <option value="">Aula normal</option>
          {Object.entries(ROTULOS_SEM_AULA).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo} (sem aula)
            </option>
          ))}
        </SelectField>

        <Button onClick={adicionar} loading={ocupado === "nova"}>
          <CalendarPlus className="size-4" aria-hidden />
          Registrar aula
        </Button>
      </div>

      {alunos.length > 0 && aulas.length > 0 && (
        <div className="border-line border-t pt-4">
          <p className="text-ink mb-2 text-sm font-medium">
            Frequência na disciplina
          </p>
          <ul className="divide-line divide-y text-sm">
            {alunos.map((aluno) => {
              const percentual = percentualNaDisciplina(aulas, aluno.matricula);
              const faltas = faltasNaDisciplina(aulas, aluno.matricula);

              return (
                <li
                  key={aluno.matricula}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-ink truncate">{aluno.nome}</span>
                  <span className="text-ink-muted shrink-0 tabular-nums">
                    {faltas} {faltas === 1 ? "falta" : "faltas"} ·{" "}
                    <strong
                      className={cn(
                        percentual !== null && percentual < 0.75
                          ? "text-danger"
                          : "text-ink",
                      )}
                    >
                      {percentual === null ? "—" : formatPercent(percentual)}
                    </strong>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function DetalheDaAula({
  alocacaoId,
  trimestre,
  aula,
  alunos,
  ocupado,
  executar,
}: {
  alocacaoId: string;
  trimestre: Trimestre;
  aula: Aula;
  alunos: AlunoDaTurma[];
  ocupado: string | null;
  executar: (
    chave: string,
    acao: () => Promise<{ ok: boolean; erro?: string }>,
  ) => Promise<boolean>;
}) {
  const [conteudo, setConteudo] = useState(aula.conteudo ?? "");
  const [faltas, setFaltas] = useState<string[]>(
    Object.entries(aula.presencas ?? {})
      .filter(([, presente]) => presente === false)
      .map(([matricula]) => matricula),
  );

  const alternar = (matricula: string) =>
    setFaltas((atuais) =>
      atuais.includes(matricula)
        ? atuais.filter((m) => m !== matricula)
        : [...atuais, matricula],
    );

  return (
    <div className="bg-surface-subtle border-line flex flex-col gap-4 border-t p-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`conteudo-${aula.numero}`}
          className="text-ink text-sm font-medium"
        >
          Conteúdo ministrado em {formatShortDate(aula.data)}
        </label>
        <textarea
          id={`conteudo-${aula.numero}`}
          rows={3}
          value={conteudo}
          onChange={(evento) => setConteudo(evento.target.value)}
          placeholder="Ex.: Leis de Newton — exercícios 41, 42 e 45 do livro didático"
          className="border-line bg-surface text-ink placeholder:text-ink-muted w-full rounded-md border px-3 py-2 text-sm"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            loading={ocupado === `conteudo-${aula.numero}`}
            onClick={() =>
              executar(`conteudo-${aula.numero}`, () =>
                registrarConteudo({
                  alocacaoId,
                  trimestre,
                  numero: aula.numero,
                  conteudo,
                }),
              )
            }
          >
            Salvar conteúdo
          </Button>
        </div>
      </div>

      {aula.semAula ? (
        <p className="text-ink-muted text-sm">
          {ROTULOS_SEM_AULA[aula.semAula]}: não há chamada, e este dia não
          entra no cálculo de frequência.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-ink text-sm font-medium">
            Chamada — marque quem faltou
          </p>

          <div
            role="group"
            aria-label={`Chamada da aula ${aula.numero}`}
            className="flex flex-wrap gap-2"
          >
            {alunos.map((aluno) => {
              const faltou = faltas.includes(aluno.matricula);

              return (
                <button
                  key={aluno.matricula}
                  type="button"
                  aria-pressed={faltou}
                  onClick={() => alternar(aluno.matricula)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm",
                    faltou
                      ? "border-danger bg-danger-surface text-danger"
                      : "border-line bg-surface text-ink-muted hover:bg-surface-subtle",
                  )}
                >
                  {aluno.nome}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-ink-muted text-xs">
              {faltas.length === 0
                ? "Ninguém marcado — todos presentes."
                : `${faltas.length} ${faltas.length === 1 ? "falta" : "faltas"}.`}
            </span>

            <Button
              size="sm"
              loading={ocupado === `chamada-${aula.numero}`}
              onClick={() =>
                executar(`chamada-${aula.numero}`, () =>
                  registrarChamadaDaAula({
                    alocacaoId,
                    trimestre,
                    numero: aula.numero,
                    faltas,
                  }),
                )
              }
            >
              Salvar chamada
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
