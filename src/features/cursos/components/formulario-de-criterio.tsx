"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CRITERIO_PADRAO,
  type CriterioComId,
  type CursoComId,
} from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { SelectField, TextAreaField, TextField } from "@/core/ui/field";
import { salvarCriterio } from "@/features/cursos/actions/criterios";

interface LinhaDeAvaliacao {
  chave: string;
  nome: string;
  peso: string;
  descricao: string;
}

function linhasDe(
  avaliacoes: ReadonlyArray<{
    nome: string;
    peso?: string | null;
    descricao?: string | null;
  }>,
): LinhaDeAvaliacao[] {
  return avaliacoes.map((avaliacao) => ({
    chave: crypto.randomUUID(),
    nome: avaliacao.nome,
    peso: avaliacao.peso ?? "",
    descricao: avaliacao.descricao ?? "",
  }));
}

/**
 * O critério de avaliação do ano.
 *
 * O formulário nasce preenchido com o que o sistema **de fato calcula**
 * (`CRITERIO_PADRAO`, tirado de `docs/avaliacao.md`). Começar em branco
 * convidaria a publicar um critério que contradiz a conta por distração de
 * quem digitou — e a família leria uma regra que o boletim não segue.
 */
export function FormularioDeCriterio({
  anoLetivo,
  cursos,
  criterio,
}: {
  anoLetivo: number;
  cursos: CursoComId[];
  criterio: CriterioComId | null;
}) {
  const router = useRouter();

  const [ano, setAno] = useState(String(criterio?.anoLetivo ?? anoLetivo));
  const [cursoCodigo, setCursoCodigo] = useState(criterio?.cursoCodigo ?? "");
  const [periodos, setPeriodos] = useState(
    String(criterio?.periodos ?? CRITERIO_PADRAO.periodos),
  );
  const [nomeDoPeriodo, setNomeDoPeriodo] = useState(
    criterio?.nomeDoPeriodo ?? CRITERIO_PADRAO.nomeDoPeriodo,
  );
  const [avaliacoes, setAvaliacoes] = useState<LinhaDeAvaliacao[]>(
    linhasDe(criterio?.avaliacoes ?? CRITERIO_PADRAO.avaliacoes),
  );
  const [mediaMinima, setMediaMinima] = useState(
    String(criterio?.mediaMinima ?? CRITERIO_PADRAO.mediaMinima),
  );
  const [frequenciaMinima, setFrequenciaMinima] = useState(
    String(criterio?.frequenciaMinima ?? CRITERIO_PADRAO.frequenciaMinima),
  );
  const [comoSeCalcula, setComoSeCalcula] = useState(
    criterio?.comoSeCalcula ?? CRITERIO_PADRAO.comoSeCalcula,
  );
  const [recuperacao, setRecuperacao] = useState(
    criterio?.recuperacao ?? CRITERIO_PADRAO.recuperacao,
  );
  const [observacoes, setObservacoes] = useState(criterio?.observacoes ?? "");
  const [publicado, setPublicado] = useState(criterio?.publicado ?? false);

  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    setAviso(null);
    setSalvando(true);

    try {
      const resultado = await salvarCriterio({
        anoLetivo: Number(ano),
        cursoCodigo: cursoCodigo || null,
        periodos: Number(periodos),
        nomeDoPeriodo,
        avaliacoes: avaliacoes
          .filter((linha) => linha.nome.trim())
          .map((linha) => ({
            nome: linha.nome.trim(),
            peso: linha.peso.trim() || null,
            descricao: linha.descricao.trim() || null,
          })),
        mediaMinima: Number(mediaMinima.replace(",", ".")),
        frequenciaMinima: Number(frequenciaMinima.replace(",", ".")),
        comoSeCalcula: comoSeCalcula.trim() || null,
        recuperacao: recuperacao.trim() || null,
        observacoes: observacoes.trim() || null,
        publicado,
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar.");
        return;
      }

      setAviso("Critério salvo.");
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

      <Card title="A quem se aplica">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Ano letivo"
            type="number"
            value={ano}
            onChange={(evento) => setAno(evento.target.value)}
          />

          <SelectField
            label="Curso"
            hint="Vazio vale para o colégio inteiro."
            value={cursoCodigo}
            onChange={(evento) => setCursoCodigo(evento.target.value)}
          >
            <option value="">Todos os cursos</option>
            {cursos.map((curso) => (
              <option key={curso.codigo} value={curso.codigo}>
                {curso.nome}
              </option>
            ))}
          </SelectField>
        </div>
      </Card>

      <Card title="Períodos e avaliações">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Quantos períodos"
            type="number"
            min={1}
            value={periodos}
            onChange={(evento) => setPeriodos(evento.target.value)}
          />
          <TextField
            label="Como o colégio chama o período"
            hint="Trimestre, bimestre, módulo."
            value={nomeDoPeriodo}
            onChange={(evento) => setNomeDoPeriodo(evento.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {avaliacoes.map((linha, indice) => (
            <div
              key={linha.chave}
              className="border-line grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <TextField
                label="Avaliação"
                value={linha.nome}
                onChange={(evento) =>
                  setAvaliacoes((atuais) =>
                    atuais.map((atual) =>
                      atual.chave === linha.chave
                        ? { ...atual, nome: evento.target.value }
                        : atual,
                    ),
                  )
                }
              />
              <TextField
                label="Quanto vale"
                hint="Texto: 1/3 da média, 40%."
                value={linha.peso}
                onChange={(evento) =>
                  setAvaliacoes((atuais) =>
                    atuais.map((atual) =>
                      atual.chave === linha.chave
                        ? { ...atual, peso: evento.target.value }
                        : atual,
                    ),
                  )
                }
              />
              <div className="flex items-end pb-1">
                <button
                  type="button"
                  aria-label={`Remover a avaliação ${indice + 1}`}
                  onClick={() =>
                    setAvaliacoes((atuais) =>
                      atuais.filter((atual) => atual.chave !== linha.chave),
                    )
                  }
                  className="text-ink-muted hover:text-danger rounded-md p-2"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}

          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setAvaliacoes((atuais) => [
                  ...atuais,
                  { chave: crypto.randomUUID(), nome: "", peso: "", descricao: "" },
                ])
              }
            >
              <Plus className="size-4" aria-hidden />
              Adicionar avaliação
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Aprovação">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Média mínima"
            inputMode="decimal"
            value={mediaMinima}
            onChange={(evento) => setMediaMinima(evento.target.value)}
          />
          <TextField
            label="Frequência mínima (%)"
            inputMode="decimal"
            value={frequenciaMinima}
            onChange={(evento) => setFrequenciaMinima(evento.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <TextAreaField
            label="Como se calcula"
            rows={4}
            value={comoSeCalcula}
            onChange={(evento) => setComoSeCalcula(evento.target.value)}
          />
          <TextAreaField
            label="Recuperação"
            rows={2}
            value={recuperacao}
            onChange={(evento) => setRecuperacao(evento.target.value)}
          />
          <TextAreaField
            label="Observações"
            rows={3}
            value={observacoes}
            onChange={(evento) => setObservacoes(evento.target.value)}
          />
        </div>
      </Card>

      <Card>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="border-line mt-0.5 size-4 rounded"
            checked={publicado}
            onChange={(evento) => setPublicado(evento.target.checked)}
          />
          <span>
            <span className="text-ink">Publicado</span>
            <span className="text-ink-muted block text-xs">
              Enquanto não publicado, só a equipe lê. O critério costuma ser
              discutido antes de virar comunicado.
            </span>
          </span>
        </label>

        <div className="mt-4 flex justify-end">
          <Button onClick={salvar} loading={salvando}>
            Salvar critério
          </Button>
        </div>

        <p className="text-ink-muted mt-3 text-xs">
          Este texto é o que o colégio divulga. Ele <strong>não</strong> muda a
          conta do boletim, que continua sendo a de{" "}
          <code>docs/avaliacao.md</code> — mudar o cálculo faria boletim já
          fechado trocar de resultado.
        </p>
      </Card>
    </div>
  );
}
