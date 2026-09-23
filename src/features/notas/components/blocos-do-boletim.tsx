"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Dependencia, Eletiva, LinhaDoBoletim } from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { SelectField, TextField } from "@/core/ui/field";
import { salvarBlocosDoBoletim } from "@/features/notas/actions/boletim";
import { paraNota, paraTexto } from "@/features/notas/domain/lancamento";

/**
 * Os blocos do boletim que não vêm das notas.
 *
 * No boletim impresso eles são preenchidos à mão, fora da grade: a
 * recuperação final, as eletivas cursadas, as dependências de anos
 * anteriores e as observações. Quem lança é a secretaria.
 */

const COMPONENTES_BILINGUE = ["STEAM", "ENGLISH", "PROJECT"] as const;

interface BlocosProps {
  matricula: string;
  anoLetivo: number;
  disciplinas: LinhaDoBoletim[];
  recuperacoes: Record<string, number | null>;
  eletivas: Eletiva[];
  dependencias: Dependencia[];
  nivelBilingue: string | null;
  notasBilingue: Record<string, Record<string, number | null>>;
  recuperacaoBilingue: Record<string, number | null>;
  observacoes: string | null;
}

export function BlocosDoBoletim(props: BlocosProps) {
  const router = useRouter();

  const [recuperacoes, setRecuperacoes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      props.disciplinas.map((linha) => [
        linha.disciplinaId,
        paraTexto(props.recuperacoes[linha.disciplinaId] ?? null),
      ]),
    ),
  );

  const [eletivas, setEletivas] = useState<Eletiva[]>(props.eletivas);
  const [dependencias, setDependencias] = useState<LinhaDeDependencia[]>(() =>
    props.dependencias.map(paraLinha),
  );
  const [nivel, setNivel] = useState(props.nivelBilingue ?? "");
  const [bilingue, setBilingue] = useState<Record<string, Record<string, string>>>(
    () => montarBilingue(props.notasBilingue, props.recuperacaoBilingue),
  );
  const [observacoes, setObservacoes] = useState(props.observacoes ?? "");

  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    setAviso(null);

    const convertidas: Record<string, number | null> = {};
    for (const [disciplinaId, texto] of Object.entries(recuperacoes)) {
      const { valor, erro: problema } = paraNota(texto);
      if (problema) {
        setErro(`Recuperação de ${nomeDaDisciplina(props, disciplinaId)}: ${problema}`);
        return;
      }
      convertidas[disciplinaId] = valor;
    }

    const componentes = [];
    for (const nome of COMPONENTES_BILINGUE) {
      const linha = bilingue[nome] ?? {};
      const trimestres: Record<string, number | null> = {};

      for (const t of ["1", "2", "3"]) {
        const { valor, erro: problema } = paraNota(linha[t] ?? "");
        if (problema) {
          setErro(`${nome}, ${t}º trimestre: ${problema}`);
          return;
        }
        trimestres[t] = valor;
      }

      const rec = paraNota(linha.rec ?? "");
      if (rec.erro) {
        setErro(`${nome}, recuperação: ${rec.erro}`);
        return;
      }

      componentes.push({ nome, trimestres, recuperacao: rec.valor });
    }

    const temBilingue =
      nivel.trim() !== "" ||
      componentes.some(
        (c) =>
          c.recuperacao !== null ||
          Object.values(c.trimestres).some((v) => v !== null),
      );

    const convertidasDependencias = [];
    for (const linha of dependencias) {
      if (!linha.disciplinaNome.trim()) continue;

      const p1 = paraNota(linha.p1);
      const p2 = paraNota(linha.p2);
      const rec = paraNota(linha.recuperacao);

      const problema = p1.erro ?? p2.erro ?? rec.erro;
      if (problema) {
        setErro(`${linha.disciplinaNome}: ${problema}`);
        return;
      }

      convertidasDependencias.push({
        disciplinaId: linha.disciplinaId || chave(linha.disciplinaNome),
        disciplinaNome: linha.disciplinaNome.trim(),
        tipo: linha.tipo,
        anoDeOrigem: linha.anoDeOrigem ? Number(linha.anoDeOrigem) : null,
        p1: p1.valor,
        p2: p2.valor,
        recuperacao: rec.valor,
        // Total, média e situação são calculados na leitura do boletim.
        total: null,
        media: null,
        situacao: "cursando" as const,
      });
    }

    setSalvando(true);

    try {
      const resultado = await salvarBlocosDoBoletim({
        matricula: props.matricula,
        anoLetivo: props.anoLetivo,
        recuperacoes: convertidas,
        eletivas: eletivas.filter((eletiva) => eletiva.nome.trim() !== ""),
        dependencias: convertidasDependencias,
        projetoBilingue: temBilingue
          ? { nivel: nivel.trim() || null, componentes }
          : null,
        observacoes: observacoes.trim() || null,
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar.");
        return;
      }

      setAviso("Boletim atualizado.");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
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

      <section>
        <h3 className="text-ink mb-1 text-sm font-medium">
          Recuperação final
        </h3>
        <p className="text-ink-muted mb-3 text-sm">
          Só no fim do ano, para média anual abaixo de 5,0. A média final é
          (média anual + recuperação) ÷ 2.
        </p>

        {props.disciplinas.length === 0 ? (
          <p className="text-ink-muted text-sm">
            Nenhuma nota lançada ainda neste ano.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {props.disciplinas.map((linha) => (
              <TextField
                key={linha.disciplinaId}
                label={linha.disciplinaNome}
                inputMode="decimal"
                hint={
                  linha.mediaAnual === null
                    ? "Ano em andamento"
                    : `Média anual ${paraTexto(linha.mediaAnual)}`
                }
                value={recuperacoes[linha.disciplinaId] ?? ""}
                onChange={(evento) =>
                  setRecuperacoes((atuais) => ({
                    ...atuais,
                    [linha.disciplinaId]: evento.target.value,
                  }))
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="border-line border-t pt-4">
        <h3 className="text-ink mb-3 text-sm font-medium">Projeto Bilíngue</h3>

        <div className="mb-3 max-w-xs">
          <TextField
            label="Nível"
            placeholder="Ex.: N2"
            value={nivel}
            onChange={(evento) => setNivel(evento.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <caption className="sr-only">
              Notas do Projeto Bilíngue por trimestre
            </caption>
            <thead>
              <tr className="border-line border-b text-left">
                <th scope="col" className="text-ink-muted py-2 pr-3 font-medium">
                  Componente
                </th>
                {["1", "2", "3"].map((t) => (
                  <th key={t} scope="col" className="text-ink-muted w-20 py-2 pr-3 font-medium">
                    {t}º
                  </th>
                ))}
                <th scope="col" className="text-ink-muted w-20 py-2 font-medium">
                  Rec.
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {COMPONENTES_BILINGUE.map((nome) => (
                <tr key={nome}>
                  <th scope="row" className="text-ink py-2 pr-3 text-left font-normal">
                    {nome}
                  </th>
                  {["1", "2", "3", "rec"].map((campo) => (
                    <td key={campo} className="py-2 pr-3">
                      <input
                        inputMode="decimal"
                        aria-label={`${nome}, ${campo === "rec" ? "recuperação" : `${campo}º trimestre`}`}
                        value={bilingue[nome]?.[campo] ?? ""}
                        onChange={(evento) =>
                          setBilingue((atuais) => ({
                            ...atuais,
                            [nome]: {
                              ...(atuais[nome] ?? {}),
                              [campo]: evento.target.value,
                            },
                          }))
                        }
                        className="border-line bg-surface text-ink w-16 rounded-md border px-2 py-1 text-sm tabular-nums"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-line border-t pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-ink text-sm font-medium">Eletivas</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setEletivas((atuais) => [
                ...atuais,
                { nome: "", periodo: null, situacao: "cursando" },
              ])
            }
          >
            <Plus className="size-4" aria-hidden />
            Adicionar
          </Button>
        </div>

        {eletivas.length === 0 ? (
          <p className="text-ink-muted text-sm">Nenhuma eletiva registrada.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {eletivas.map((eletiva, indice) => (
              <li
                key={indice}
                className="grid gap-2 sm:grid-cols-[1fr_10rem_10rem_auto] sm:items-end"
              >
                <TextField
                  label="Disciplina"
                  value={eletiva.nome}
                  onChange={(evento) =>
                    setEletivas(trocar<Eletiva>(indice, { nome: evento.target.value }))
                  }
                />
                <TextField
                  label="Período"
                  placeholder="2026.02"
                  value={eletiva.periodo ?? ""}
                  onChange={(evento) =>
                    setEletivas(
                      trocar<Eletiva>(indice, { periodo: evento.target.value || null }),
                    )
                  }
                />
                <SelectField
                  label="Situação"
                  value={eletiva.situacao}
                  onChange={(evento) =>
                    setEletivas(
                      trocar<Eletiva>(indice, {
                        situacao: evento.target.value as Eletiva["situacao"],
                      }),
                    )
                  }
                >
                  <option value="cursando">Cursando</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </SelectField>

                <button
                  type="button"
                  aria-label={`Remover eletiva ${eletiva.nome || indice + 1}`}
                  onClick={() =>
                    setEletivas((atuais) =>
                      atuais.filter((_, i) => i !== indice),
                    )
                  }
                  className="text-ink-muted hover:text-danger h-10 px-2"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-line border-t pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-ink text-sm font-medium">
            Dependência e reclassificação
          </h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setDependencias((atuais) => [
                ...atuais,
                {
                  disciplinaId: "",
                  disciplinaNome: "",
                  tipo: "dependencia",
                  anoDeOrigem: "",
                  p1: "",
                  p2: "",
                  recuperacao: "",
                },
              ])
            }
          >
            <Plus className="size-4" aria-hidden />
            Adicionar
          </Button>
        </div>

        {dependencias.length === 0 ? (
          <p className="text-ink-muted text-sm">
            Nenhuma dependência registrada.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {dependencias.map((linha, indice) => (
              <li
                key={indice}
                className="grid gap-2 sm:grid-cols-[1fr_9rem_6rem_5rem_5rem_5rem_auto] sm:items-end"
              >
                <TextField
                  label="Disciplina"
                  value={linha.disciplinaNome}
                  onChange={(evento) =>
                    setDependencias(
                      trocar<LinhaDeDependencia>(indice, { disciplinaNome: evento.target.value }),
                    )
                  }
                />
                <SelectField
                  label="Tipo"
                  value={linha.tipo}
                  onChange={(evento) =>
                    setDependencias(
                      trocar<LinhaDeDependencia>(indice, {
                        tipo: evento.target.value as Dependencia["tipo"],
                      }),
                    )
                  }
                >
                  <option value="dependencia">Dependência</option>
                  <option value="reclassificacao">Reclassificação</option>
                </SelectField>
                <TextField
                  label="Ano"
                  inputMode="numeric"
                  value={linha.anoDeOrigem}
                  onChange={(evento) =>
                    setDependencias(
                      trocar<LinhaDeDependencia>(indice, { anoDeOrigem: evento.target.value }),
                    )
                  }
                />
                <TextField
                  label="P1"
                  inputMode="decimal"
                  value={linha.p1}
                  onChange={(evento) =>
                    setDependencias(trocar<LinhaDeDependencia>(indice, { p1: evento.target.value }))
                  }
                />
                <TextField
                  label="P2"
                  inputMode="decimal"
                  value={linha.p2}
                  onChange={(evento) =>
                    setDependencias(trocar<LinhaDeDependencia>(indice, { p2: evento.target.value }))
                  }
                />
                <TextField
                  label="Rec."
                  inputMode="decimal"
                  value={linha.recuperacao}
                  onChange={(evento) =>
                    setDependencias(
                      trocar<LinhaDeDependencia>(indice, { recuperacao: evento.target.value }),
                    )
                  }
                />

                <button
                  type="button"
                  aria-label={`Remover dependência ${linha.disciplinaNome || indice + 1}`}
                  onClick={() =>
                    setDependencias((atuais) =>
                      atuais.filter((_, i) => i !== indice),
                    )
                  }
                  className="text-ink-muted hover:text-danger h-10 px-2"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-line border-t pt-4">
        <label
          htmlFor="observacoes-do-boletim"
          className="text-ink mb-1 block text-sm font-medium"
        >
          Observações
        </label>
        <textarea
          id="observacoes-do-boletim"
          rows={3}
          value={observacoes}
          onChange={(evento) => setObservacoes(evento.target.value)}
          className="border-line bg-surface text-ink w-full rounded-md border px-3 py-2 text-sm"
        />
      </section>

      <div className="border-line flex justify-end border-t pt-4">
        <Button onClick={salvar} loading={salvando}>
          Salvar boletim
        </Button>
      </div>
    </div>
  );
}

interface LinhaDeDependencia {
  disciplinaId: string;
  disciplinaNome: string;
  tipo: Dependencia["tipo"];
  anoDeOrigem: string;
  p1: string;
  p2: string;
  recuperacao: string;
}

function paraLinha(dependencia: Dependencia): LinhaDeDependencia {
  return {
    disciplinaId: dependencia.disciplinaId,
    disciplinaNome: dependencia.disciplinaNome,
    tipo: dependencia.tipo,
    anoDeOrigem: dependencia.anoDeOrigem ? String(dependencia.anoDeOrigem) : "",
    p1: paraTexto(dependencia.p1),
    p2: paraTexto(dependencia.p2),
    recuperacao: paraTexto(dependencia.recuperacao),
  };
}

function montarBilingue(
  notas: Record<string, Record<string, number | null>>,
  recuperacao: Record<string, number | null>,
): Record<string, Record<string, string>> {
  const montado: Record<string, Record<string, string>> = {};

  for (const nome of COMPONENTES_BILINGUE) {
    montado[nome] = {
      "1": paraTexto(notas[nome]?.["1"] ?? null),
      "2": paraTexto(notas[nome]?.["2"] ?? null),
      "3": paraTexto(notas[nome]?.["3"] ?? null),
      rec: paraTexto(recuperacao[nome] ?? null),
    };
  }

  return montado;
}

/** Atualiza um item da lista sem mexer nos outros. */
function trocar<T>(indice: number, campos: Partial<T>) {
  return (atuais: T[]): T[] =>
    atuais.map((item, i) => (i === indice ? { ...item, ...campos } : item));
}

function nomeDaDisciplina(props: BlocosProps, disciplinaId: string): string {
  return (
    props.disciplinas.find((linha) => linha.disciplinaId === disciplinaId)
      ?.disciplinaNome ?? disciplinaId
  );
}

/** Id estável para uma dependência digitada à mão. */
function chave(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
