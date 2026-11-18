"use client";

import { Check, Copy, Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  COLUNAS_DO_BOLETIM,
  COLUNAS_OBRIGATORIAS,
  type BoletimManual,
  type ColunaDoBoletim,
  type LinhaDoBoletim,
} from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { TextField } from "@/core/ui/field";
import {
  criarBoletimManual,
  excluirBoletimManual,
  marcarBoletimOficial,
  salvarBoletimManual,
} from "@/features/notas/actions/boletim-manual";
import {
  divergenciaDaMedia,
  rotuloDaColuna,
} from "@/features/notas/domain/boletim-manual";

/**
 * O boletim 2: criar a cópia, editar os valores e dizer qual vale.
 *
 * A tela inteira é da secretaria. A decisão que importa é a caixa
 * **"Este é o boletim oficial"**: marcada, o Portal e a impressão passam a
 * entregar este documento, e o calculado some para a família.
 */

const TRIMESTRES = ["1", "2", "3"] as const;
const AVALIACOES = ["projeto", "tarefas", "av"] as const;

export function BoletimManualDoAluno({
  matricula,
  anoLetivo,
  manual,
}: {
  matricula: string;
  anoLetivo: number;
  manual: BoletimManual | null;
}) {
  const router = useRouter();

  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function executar(
    acao: () => Promise<{ ok: boolean; erro?: string }>,
    sucesso?: string,
  ) {
    setErro(null);
    setAviso(null);
    setOcupado(true);

    try {
      const resultado = await acao();

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar.");
        return false;
      }

      if (sucesso) setAviso(sucesso);
      router.refresh();
      return true;
    } finally {
      setOcupado(false);
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

      {!manual ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink-muted max-w-prose text-sm">
            O boletim 2 nasce como <strong>cópia do boletim calculado</strong>,
            com as notas que já estão lançadas. A partir daí ele não se
            recalcula: o valor que você digitar é o que sai no papel.
          </p>

          <Button
            loading={ocupado}
            onClick={() =>
              executar(
                () => criarBoletimManual({ matricula, anoLetivo }),
                "Cópia criada. Confira os valores antes de marcar como oficial.",
              )
            }
          >
            <Copy className="size-4" aria-hidden />
            Criar o boletim 2
          </Button>
        </div>
      ) : (
        <Editor
          matricula={matricula}
          anoLetivo={anoLetivo}
          manual={manual}
          ocupado={ocupado}
          executar={executar}
        />
      )}
    </div>
  );
}

function Editor({
  matricula,
  anoLetivo,
  manual,
  ocupado,
  executar,
}: {
  matricula: string;
  anoLetivo: number;
  manual: BoletimManual;
  ocupado: boolean;
  executar: (
    acao: () => Promise<{ ok: boolean; erro?: string }>,
    sucesso?: string,
  ) => Promise<boolean>;
}) {
  const [linhas, setLinhas] = useState<LinhaDoBoletim[]>(manual.disciplinas);
  const [rotulos, setRotulos] = useState(manual.rotulos ?? {});
  const [ocultas, setOcultas] = useState<ColunaDoBoletim[]>(manual.ocultas ?? []);

  function mudarValor(
    indice: number,
    muda: (linha: LinhaDoBoletim) => LinhaDoBoletim,
  ) {
    setLinhas((atuais) =>
      atuais.map((linha, i) => (i === indice ? muda(linha) : linha)),
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border-line bg-surface-subtle flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-brand-600 mt-0.5 size-4"
            checked={manual.oficial}
            disabled={ocupado}
            onChange={(evento) =>
              executar(
                () =>
                  marcarBoletimOficial({
                    matricula,
                    anoLetivo,
                    oficial: evento.target.checked,
                  }),
                evento.target.checked
                  ? "O boletim 2 passou a ser o oficial."
                  : "Voltou a valer o boletim calculado.",
              )
            }
          />
          <span>
            <strong className="text-ink">Este é o boletim oficial</strong>
            <span className="text-ink-muted block text-xs">
              É o que o aluno e o responsável veem no Portal, e o que sai na
              impressão. Desmarcado, vale o calculado.
            </span>
          </span>
        </label>

        <span
          className={
            manual.oficial
              ? "border-warning bg-warning-surface text-warning rounded-md border px-2 py-1 text-xs font-medium"
              : "text-ink-muted text-xs"
          }
        >
          {manual.oficial ? "Valendo: boletim 2" : "Valendo: boletim calculado"}
        </span>
      </div>

      {/*
        O aplicativo lê as notas direto do banco e ainda não conhece este
        documento. Enquanto a equipe Android não atualizar, a família vê
        no app o boletim calculado — dizer isso aqui é o que evita a
        secretaria descobrir pelo telefonema.
      */}
      {manual.oficial && (
        <p className="border-warning bg-warning-surface text-warning flex gap-2 rounded-md border px-3 py-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            No <strong>aplicativo</strong> a família ainda vê o boletim
            calculado: ele lê as notas direto e ainda não conhece o boletim 2.
            No Portal e na impressão já vale este.
          </span>
        </p>
      )}

      <div>
        <p className="text-ink mb-2 text-sm font-medium">Títulos das colunas</p>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {COLUNAS_DO_BOLETIM.map((coluna) => (
            <div key={coluna} className="flex flex-col gap-1">
              <TextField
                label={rotuloDaColuna(coluna, {})}
                value={rotulos[coluna] ?? ""}
                placeholder={rotuloDaColuna(coluna, {})}
                onChange={(evento) =>
                  setRotulos((atuais) => ({
                    ...atuais,
                    [coluna]: evento.target.value,
                  }))
                }
              />

              {!COLUNAS_OBRIGATORIAS.includes(coluna) && (
                <label className="text-ink-muted flex cursor-pointer items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    className="accent-brand-600 size-3.5"
                    checked={ocultas.includes(coluna)}
                    onChange={(evento) =>
                      setOcultas((atuais) =>
                        evento.target.checked
                          ? [...atuais, coluna]
                          : atuais.filter((atual) => atual !== coluna),
                      )
                    }
                  />
                  Esconder
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <caption className="sr-only">
            Valores do boletim 2, por disciplina e trimestre
          </caption>
          <thead>
            <tr className="border-line border-b">
              <th scope="col" className="text-ink-muted py-2 text-left text-xs">
                {rotuloDaColuna("disciplina", rotulos)}
              </th>
              {TRIMESTRES.map((t) => (
                <th
                  key={t}
                  scope="col"
                  colSpan={4}
                  className="text-ink-muted py-2 text-center text-xs"
                >
                  {t}º trimestre
                </th>
              ))}
              <th scope="col" className="text-ink-muted py-2 text-center text-xs">
                {rotuloDaColuna("mediaFinal", rotulos)}
              </th>
            </tr>
          </thead>

          <tbody className="divide-line divide-y">
            {linhas.map((linha, indice) => (
              <tr key={linha.disciplinaId}>
                <th scope="row" className="text-ink py-1.5 pr-2 text-left font-normal">
                  {linha.disciplinaNome}
                </th>

                {TRIMESTRES.map((t) => (
                  <CelulasDoTrimestre
                    key={t}
                    trimestre={t}
                    linha={linha}
                    rotulos={rotulos}
                    onMudar={(muda) => mudarValor(indice, muda)}
                  />
                ))}

                <td className="px-0.5 py-1">
                  <Campo
                    rotulo={`${rotuloDaColuna("mediaFinal", rotulos)} de ${linha.disciplinaNome}`}
                    valor={linha.mediaFinal}
                    onMudar={(valor) =>
                      mudarValor(indice, (atual) => ({
                        ...atual,
                        mediaFinal: valor,
                      }))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={ocupado}
          onClick={async () => {
            if (
              !confirm(
                "Apagar o boletim 2 deste aluno? O boletim calculado volta a valer.",
              )
            ) {
              return;
            }

            await executar(
              () => excluirBoletimManual({ matricula, anoLetivo }),
              "Boletim 2 apagado.",
            );
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          Apagar o boletim 2
        </Button>

        <Button
          loading={ocupado}
          onClick={() =>
            executar(
              () =>
                salvarBoletimManual({
                  matricula,
                  anoLetivo,
                  rotulos,
                  ocultas,
                  disciplinas: linhas,
                }),
              "Boletim 2 salvo.",
            )
          }
        >
          <Check className="size-4" aria-hidden />
          Salvar o boletim 2
        </Button>
      </div>
    </div>
  );
}

function CelulasDoTrimestre({
  trimestre,
  linha,
  rotulos,
  onMudar,
}: {
  trimestre: string;
  linha: LinhaDoBoletim;
  rotulos: BoletimManual["rotulos"];
  onMudar: (muda: (linha: LinhaDoBoletim) => LinhaDoBoletim) => void;
}) {
  const avaliacoes = linha.trimestres?.[trimestre];
  const media = linha.mediasPorTrimestre?.[trimestre] ?? null;
  const calculada = divergenciaDaMedia(avaliacoes, media);

  return (
    <>
      {AVALIACOES.map((campo) => (
        <td key={campo} className="px-0.5 py-1">
          <Campo
            rotulo={`${rotuloDaColuna(campo, rotulos)} do ${trimestre}º trimestre de ${linha.disciplinaNome}`}
            valor={avaliacoes?.[campo] ?? null}
            onMudar={(valor) =>
              onMudar((atual) => ({
                ...atual,
                trimestres: {
                  ...atual.trimestres,
                  // O trimestre pode não existir ainda — disciplina sem
                  // nenhuma nota lançada não tem o objeto. Sem o padrão,
                  // digitar a primeira nota gravaria um trimestre sem os
                  // outros dois campos, e o schema recusaria.
                  [trimestre]: {
                    ...{ projeto: null, tarefas: null, av: null },
                    ...atual.trimestres?.[trimestre],
                    [campo]: valor,
                  },
                },
              }))
            }
          />
        </td>
      ))}

      <td className="px-0.5 py-1">
        <Campo
          destacado
          rotulo={`${rotuloDaColuna("media", rotulos)} do ${trimestre}º trimestre de ${linha.disciplinaNome}`}
          valor={media}
          onMudar={(valor) =>
            onMudar((atual) => ({
              ...atual,
              mediasPorTrimestre: {
                ...atual.mediasPorTrimestre,
                [trimestre]: valor,
              },
            }))
          }
        />

        {/*
          A média que não bate com as três notas é **permitida** — é o
          ponto deste boletim. O aviso existe para a divergência ser
          escolhida, e não um erro de digitação que ninguém conferiu.
        */}
        {calculada !== null && (
          <span
            className="text-warning mt-0.5 block text-center text-[10px]"
            title={`As três avaliações dão ${calculada.toFixed(2).replace(".", ",")}`}
          >
            ≠ {calculada.toFixed(1).replace(".", ",")}
          </span>
        )}
      </td>
    </>
  );
}

/**
 * Campo de nota do boletim 2.
 *
 * Aceita vírgula, como a secretaria digita, e guarda `null` quando fica
 * vazio — célula vazia no boletim é diferente de zero, e zero é nota.
 */
function Campo({
  rotulo,
  valor,
  destacado,
  onMudar,
}: {
  rotulo: string;
  valor: number | null;
  destacado?: boolean;
  onMudar: (valor: number | null) => void;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={rotulo}
      value={valor === null ? "" : String(valor).replace(".", ",")}
      onChange={(evento) => {
        const texto = evento.target.value.trim().replace(",", ".");

        if (texto === "") return onMudar(null);

        const numero = Number(texto);
        if (!Number.isNaN(numero) && numero >= 0 && numero <= 10) {
          onMudar(numero);
        }
      }}
      className={`border-line bg-surface text-ink h-8 w-14 rounded border text-center text-sm tabular-nums ${
        destacado ? "font-semibold" : ""
      }`}
    />
  );
}
