"use client";

import { Check, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ROTULOS_DE_OCORRENCIA,
  type SituacaoDePresenca,
  type TipoDeOcorrencia,
} from "@/core/modelo";
import { cn } from "@/core/lib/cn";
import { Button } from "@/core/ui/button";
import { salvarChamada } from "@/features/frequencia/actions/chamada";
import {
  linhasParaGravar,
  resumoDaChamada,
  type LinhaDaChamada,
} from "@/features/frequencia/domain/chamada";

interface ChamadaProps {
  turmaId: string;
  turmaCodigo: string;
  data: string;
  linhas: LinhaDaChamada[];
}

const SITUACOES: {
  valor: SituacaoDePresenca;
  letra: string;
  rotulo: string;
}[] = [
  { valor: "presente", letra: "P", rotulo: "Presente" },
  { valor: "falta", letra: "F", rotulo: "Falta" },
  { valor: "atraso", letra: "A", rotulo: "Atraso" },
];

const CORES: Record<SituacaoDePresenca, string> = {
  presente: "bg-success-surface text-success border-success",
  falta: "bg-danger-surface text-danger border-danger",
  atraso: "bg-warning-surface text-warning border-warning",
};

/**
 * Chamada do dia.
 *
 * A secretaria faz isso todo dia para cada turma, então a tela é construída
 * em volta da velocidade: todo mundo começa presente, as letras P/F/A são as
 * mesmas da planilha, e o botão de situação cicla no clique. Nada de abrir
 * um diálogo por aluno.
 */
export function Chamada({
  turmaId,
  turmaCodigo,
  data,
  linhas: iniciais,
}: ChamadaProps) {
  const router = useRouter();
  const [linhas, setLinhas] = useState(iniciais);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const pendentes = linhasParaGravar(linhas, iniciais);
  const resumo = resumoDaChamada(linhas);

  function alterar(matricula: string, mudanca: Partial<LinhaDaChamada>) {
    setLinhas((atuais) =>
      atuais.map((linha) =>
        linha.matricula === matricula ? { ...linha, ...mudanca } : linha,
      ),
    );
  }

  async function salvar() {
    setErro(null);
    setAviso(null);

    if (pendentes.length === 0) {
      setAviso("Nada mudou desde o último salvamento.");
      return;
    }

    setSalvando(true);

    try {
      const resultado = await salvarChamada({
        turmaId,
        turmaCodigo,
        data,
        linhas: pendentes.map((linha) => ({
          matricula: linha.matricula,
          nome: linha.nome,
          situacao: linha.situacao,
          ocorrencia: linha.ocorrencia,
          observacao: linha.observacao,
        })),
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar a chamada.");
        return;
      }

      setAviso(
        `${resultado.gravados} ${resultado.gravados === 1 ? "registro gravado" : "registros gravados"}.`,
      );
      router.refresh();
    } catch {
      setErro("O salvamento foi interrompido. Verifique a conexão.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-ink-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span>{resumo.total} alunos</span>
        <span className="text-success">{resumo.presentes} presentes</span>
        <span className="text-danger">{resumo.faltas} faltas</span>
        <span className="text-warning">{resumo.atrasos} atrasos</span>
        {resumo.ocorrencias > 0 && (
          <span>{resumo.ocorrencias} com ocorrência</span>
        )}
      </div>

      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      {aviso && (
        <p className="border-success bg-success-surface text-success rounded-md border px-3 py-2 text-sm">
          {aviso}
        </p>
      )}

      <div className="border-line divide-line divide-y rounded-md border">
        {linhas.map((linha) => (
          <div
            key={linha.matricula}
            className="grid gap-3 p-3 sm:grid-cols-[1fr_auto_12rem_1fr] sm:items-center"
          >
            <div className="min-w-0">
              <p className="text-ink truncate text-sm font-medium">
                {linha.nome}
              </p>
              <p className="text-ink-muted text-xs tabular-nums">
                {linha.matricula}
              </p>
            </div>

            <div
              className="flex gap-1"
              role="group"
              aria-label={`Presença de ${linha.nome}`}
            >
              {SITUACOES.map((situacao) => (
                <button
                  key={situacao.valor}
                  type="button"
                  aria-pressed={linha.situacao === situacao.valor}
                  title={situacao.rotulo}
                  onClick={() =>
                    alterar(linha.matricula, { situacao: situacao.valor })
                  }
                  className={cn(
                    "size-9 rounded-md border text-sm font-semibold",
                    linha.situacao === situacao.valor
                      ? CORES[situacao.valor]
                      : "border-line text-ink-muted hover:bg-surface-subtle",
                  )}
                >
                  {situacao.letra}
                </button>
              ))}
            </div>

            <select
              aria-label={`Ocorrência de ${linha.nome}`}
              value={linha.ocorrencia ?? ""}
              onChange={(evento) =>
                alterar(linha.matricula, {
                  ocorrencia: (evento.target.value ||
                    null) as TipoDeOcorrencia | null,
                })
              }
              className="border-line bg-surface text-ink h-9 rounded-md border px-2 text-sm"
            >
              <option value="">Sem ocorrência</option>
              {Object.entries(ROTULOS_DE_OCORRENCIA).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>

            <input
              aria-label={`Observação sobre ${linha.nome}`}
              placeholder="Observação"
              value={linha.observacao}
              onChange={(evento) =>
                alterar(linha.matricula, { observacao: evento.target.value })
              }
              // Enter salva: a secretaria termina a linha e segue.
              onKeyDown={(evento) => {
                if (evento.key === "Enter") salvar();
              }}
              className="border-line bg-surface text-ink placeholder:text-ink-muted h-9 rounded-md border px-2 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="border-line bg-surface sticky bottom-0 flex items-center justify-end gap-3 border-t py-3">
        <span className="text-ink-muted mr-auto text-sm">
          {pendentes.length === 0 ? (
            <span className="text-success inline-flex items-center gap-1.5">
              <Check className="size-4" aria-hidden />
              Tudo salvo
            </span>
          ) : (
            `${pendentes.length} ${pendentes.length === 1 ? "alteração" : "alterações"} não salvas`
          )}
        </span>

        <Button
          onClick={salvar}
          loading={salvando}
          disabled={pendentes.length === 0}
        >
          <Save className="size-4" aria-hidden />
          Salvar chamada
        </Button>
      </div>

      <p className="text-ink-muted text-xs">
        Todo aluno começa como presente — marque só as exceções, como na
        planilha. Atraso conta como presença no cálculo de frequência.
      </p>
    </div>
  );
}
