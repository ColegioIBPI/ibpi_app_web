"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { cn } from "@/core/lib/cn";
import { formatGrade } from "@/core/lib/format";
import type { Trimestre } from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { lancarNotas } from "@/features/notas/actions/notas";
import { mediaDoTrimestre } from "@/features/notas/domain/calculo";
import {
  AVALIACOES,
  linhasParaGravar,
  paraNota,
  ROTULOS_DE_AVALIACAO,
  validarLancamento,
  type CampoDeAvaliacao,
  type LinhaDeLancamento,
} from "@/features/notas/domain/lancamento";

interface GradeProps {
  alocacaoId: string;
  trimestre: Trimestre;
  linhas: LinhaDeLancamento[];
  /** Faltas contadas no diário de classe, por matrícula. */
  faltasDoDiario: Record<string, number>;
}

/**
 * Grade de lançamento: alunos nas linhas, as três avaliações nas colunas.
 *
 * A média aparece enquanto se digita, porque é o número que o professor
 * confere — descobrir só depois de salvar que uma nota saiu trocada custa
 * uma ida e volta a cada erro de digitação.
 */
export function GradeDeNotas({
  alocacaoId,
  trimestre,
  linhas: iniciais,
  faltasDoDiario,
}: GradeProps) {
  const router = useRouter();
  const [linhas, setLinhas] = useState(iniciais);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const pendentes = useMemo(
    () => linhasParaGravar(linhas, iniciais),
    [linhas, iniciais],
  );

  function editar(
    matricula: string,
    campo: CampoDeAvaliacao,
    valor: string,
  ) {
    setLinhas((atuais) =>
      atuais.map((linha) =>
        linha.matricula === matricula
          ? { ...linha, avaliacoes: { ...linha.avaliacoes, [campo]: valor } }
          : linha,
      ),
    );
  }

  function editarFaltas(matricula: string, valor: string) {
    const faltas = Math.max(0, Math.trunc(Number(valor) || 0));

    setLinhas((atuais) =>
      atuais.map((linha) =>
        linha.matricula === matricula ? { ...linha, faltas } : linha,
      ),
    );
  }

  async function salvar() {
    setErro(null);
    setAviso(null);

    const { linhas: validadas, erros: encontrados } = validarLancamento(
      pendentes,
    );
    setErros(encontrados);

    if (Object.keys(encontrados).length > 0) {
      setErro("Corrija as notas marcadas antes de salvar.");
      return;
    }

    if (validadas.length === 0) {
      setAviso("Nada mudou desde o último salvamento.");
      return;
    }

    setSalvando(true);

    try {
      const resultado = await lancarNotas({
        alocacaoId,
        trimestre,
        linhas: validadas,
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar as notas.");
        return;
      }

      setAviso(
        resultado.gravados === 1
          ? "1 aluno atualizado."
          : `${resultado.gravados} alunos atualizados.`,
      );
      router.refresh();
    } finally {
      setSalvando(false);
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

      {aviso && (
        <p className="border-line bg-surface-subtle text-ink-muted rounded-md border px-3 py-2 text-sm">
          {aviso}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <caption className="sr-only">
            Lançamento de notas do {trimestre}º trimestre
          </caption>
          <thead>
            <tr className="border-line border-b text-left">
              <th scope="col" className="text-ink-muted py-2 pr-3 font-medium">
                Aluno
              </th>
              {AVALIACOES.map((campo) => (
                <th
                  key={campo}
                  scope="col"
                  className="text-ink-muted w-20 py-2 pr-3 font-medium"
                >
                  {ROTULOS_DE_AVALIACAO[campo]}
                </th>
              ))}
              <th scope="col" className="text-ink-muted w-20 py-2 pr-3 font-medium">
                Faltas
              </th>
              <th scope="col" className="text-ink-muted w-20 py-2 font-medium">
                Média
              </th>
            </tr>
          </thead>

          <tbody className="divide-line divide-y">
            {linhas.map((linha) => {
              const media = mediaDaLinha(linha);
              const erroDaLinha = erros[linha.matricula];
              const doDiario = faltasDoDiario[linha.matricula] ?? 0;

              return (
                <tr key={linha.matricula}>
                  <th
                    scope="row"
                    className="text-ink py-2 pr-3 text-left font-normal"
                  >
                    {linha.nome}
                    {erroDaLinha && (
                      <span
                        role="alert"
                        className="text-danger block text-xs"
                      >
                        {erroDaLinha}
                      </span>
                    )}
                  </th>

                  {AVALIACOES.map((campo) => (
                    <td key={campo} className="py-2 pr-3">
                      <input
                        inputMode="decimal"
                        aria-label={`${ROTULOS_DE_AVALIACAO[campo]} de ${linha.nome}`}
                        aria-invalid={Boolean(erroDaLinha)}
                        value={linha.avaliacoes[campo]}
                        onChange={(evento) =>
                          editar(linha.matricula, campo, evento.target.value)
                        }
                        className={cn(
                          "border-line bg-surface text-ink w-16 rounded-md border px-2 py-1 text-sm tabular-nums",
                          erroDaLinha && "border-danger",
                        )}
                      />
                    </td>
                  ))}

                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min={0}
                      aria-label={`Faltas de ${linha.nome}`}
                      value={linha.faltas}
                      onChange={(evento) =>
                        editarFaltas(linha.matricula, evento.target.value)
                      }
                      className="border-line bg-surface text-ink w-16 rounded-md border px-2 py-1 text-sm tabular-nums"
                    />
                    {doDiario !== linha.faltas && (
                      <span className="text-ink-muted block text-xs">
                        diário: {doDiario}
                      </span>
                    )}
                  </td>

                  <td
                    className={cn(
                      "py-2 tabular-nums",
                      media !== null && media < 5
                        ? "text-danger font-medium"
                        : "text-ink",
                    )}
                  >
                    {media === null ? "—" : formatGrade(media)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-line flex items-center justify-between gap-3 border-t pt-4">
        <span className="text-ink-muted text-sm">
          {pendentes.length === 0
            ? "Nada alterado."
            : pendentes.length === 1
              ? "1 aluno com alteração pendente."
              : `${pendentes.length} alunos com alteração pendente.`}
        </span>

        <Button onClick={salvar} loading={salvando}>
          Salvar notas
        </Button>
      </div>
    </div>
  );
}

/** Média da linha enquanto se digita, sem passar pelo servidor. */
function mediaDaLinha(linha: LinhaDeLancamento): number | null {
  const avaliacoes = {
    projeto: paraNota(linha.avaliacoes.projeto).valor,
    tarefas: paraNota(linha.avaliacoes.tarefas).valor,
    av: paraNota(linha.avaliacoes.av).valor,
  };

  return mediaDoTrimestre(avaliacoes);
}
