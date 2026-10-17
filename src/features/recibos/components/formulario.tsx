"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatCurrency, parsearDinheiro } from "@/core/lib/format";
import {
  FORMAS_DE_PAGAMENTO_DO_RECIBO,
  ROTULOS_DE_FORMA_DO_RECIBO,
  ROTULOS_DE_SERVICO,
  SERVICOS,
  type FormaDePagamentoDoRecibo,
  type TipoDeServico,
} from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { SelectField, TextAreaField, TextField } from "@/core/ui/field";
import { emitirRecibo } from "@/features/recibos/actions/recibos";
import { totalDoRecibo } from "@/features/recibos/domain/recibo";

export interface OpcaoDeAluno {
  matricula: string;
  nome: string;
}

export interface OpcaoDeSerie {
  serie: string;
  descricao: string | null;
  proximoNumero: number;
}

/** Uma linha do corpo do recibo, ainda como texto digitado. */
interface Linha {
  /** Só para o React — o índice não serve, porque linhas são removidas. */
  chave: string;
  servico: TipoDeServico;
  referencia: string;
  formaDePagamento: FormaDePagamentoDoRecibo;
  referenciaDoPagamento: string;
  valor: string;
}

function linhaNova(): Linha {
  return {
    chave: crypto.randomUUID(),
    servico: "mensalidade",
    referencia: "",
    formaDePagamento: "pix",
    referenciaDoPagamento: "",
    valor: "",
  };
}

/**
 * Emissão de recibo.
 *
 * O total é calculado na tela com a **mesma função** que o servidor usa
 * para somar, então o número que a secretaria confere antes de emitir é,
 * por construção, o que vai sair impresso. Conferir antes importa aqui mais
 * que em qualquer outra tela: depois de emitido, recibo não se edita — se
 * estiver errado, cancela e emite outro.
 */
export function FormularioDeRecibo({
  alunos,
  series,
  matriculaInicial,
}: {
  alunos: OpcaoDeAluno[];
  series: OpcaoDeSerie[];
  matriculaInicial?: string;
}) {
  const router = useRouter();

  const [serie, setSerie] = useState(series[0]?.serie ?? "");
  const [matricula, setMatricula] = useState(matriculaInicial ?? "");
  const [linhas, setLinhas] = useState<Linha[]>([linhaNova()]);
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [emitindo, setEmitindo] = useState(false);

  const itens = linhas.map((linha) => ({
    servico: linha.servico,
    referencia: linha.referencia.trim() || null,
    formaDePagamento: linha.formaDePagamento,
    referenciaDoPagamento: linha.referenciaDoPagamento.trim() || null,
    valor: parsearDinheiro(linha.valor),
  }));

  const total = totalDoRecibo(itens);

  function alterar(chave: string, mudanca: Partial<Linha>) {
    setLinhas((atuais) =>
      atuais.map((linha) =>
        linha.chave === chave ? { ...linha, ...mudanca } : linha,
      ),
    );
  }

  async function emitir() {
    setErro(null);

    if (!serie) {
      setErro("Escolha a série do talão.");
      return;
    }

    if (!matricula) {
      setErro("Escolha o aluno.");
      return;
    }

    if (itens.some((item) => item.valor <= 0)) {
      setErro("Todo item precisa de um valor maior que zero.");
      return;
    }

    setEmitindo(true);

    try {
      const resultado = await emitirRecibo({
        serie,
        matricula,
        itens,
        observacoes: observacoes.trim() || null,
      });

      if (!resultado.ok || !resultado.id) {
        setErro(resultado.erro ?? "Não foi possível emitir o recibo.");
        return;
      }

      // Vai direto para o recibo emitido, que é a tela de impressão: quem
      // emite está com a família esperando o papel.
      router.push(`/gestao/recibos/${resultado.id}`);
    } finally {
      setEmitindo(false);
    }
  }

  if (series.length === 0) {
    return (
      <Card>
        <p className="text-ink text-sm">
          Nenhuma série de recibos aberta. Abra um talão na tela de recibos
          antes de emitir — é ele que define a numeração.
        </p>
      </Card>
    );
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

      <Card title="Cabeçalho">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Série"
            hint="O talão de onde sai o número."
            value={serie}
            onChange={(evento) => setSerie(evento.target.value)}
          >
            {series.map((opcao) => (
              <option key={opcao.serie} value={opcao.serie}>
                {opcao.serie}
                {opcao.descricao ? ` — ${opcao.descricao}` : ""} (próximo nº{" "}
                {opcao.proximoNumero})
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Aluno"
            hint="Matrícula, curso e série entram no recibo como estão hoje."
            value={matricula}
            onChange={(evento) => setMatricula(evento.target.value)}
          >
            <option value="">Selecione…</option>
            {alunos.map((aluno) => (
              <option key={aluno.matricula} value={aluno.matricula}>
                {aluno.nome} — {aluno.matricula}
              </option>
            ))}
          </SelectField>
        </div>

        <p className="text-ink-muted mt-3 text-xs">
          O número e o emissor são preenchidos na emissão: o número vem do
          talão, e o emissor é quem está com a sessão aberta.
        </p>
      </Card>

      <Card
        title="Itens"
        description="Um por serviço cobrado. Cada item tem a própria forma de pagamento."
      >
        <div className="flex flex-col gap-4">
          {linhas.map((linha, indice) => (
            <div
              key={linha.chave}
              className="border-line rounded-md border p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-ink-muted text-xs font-medium">
                  Item {indice + 1}
                </span>
                {linhas.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remover item ${indice + 1}`}
                    onClick={() =>
                      setLinhas((atuais) =>
                        atuais.filter((atual) => atual.chave !== linha.chave),
                      )
                    }
                    className="text-ink-muted hover:text-danger rounded-md p-1"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Serviço"
                  value={linha.servico}
                  onChange={(evento) =>
                    alterar(linha.chave, {
                      servico: evento.target.value as TipoDeServico,
                    })
                  }
                >
                  {SERVICOS.map((servico) => (
                    <option key={servico} value={servico}>
                      {ROTULOS_DE_SERVICO[servico]}
                    </option>
                  ))}
                </SelectField>

                <TextField
                  label="Referência"
                  hint="Parcela 5/12, Fevereiro/2026, 2º bimestre."
                  value={linha.referencia}
                  onChange={(evento) =>
                    alterar(linha.chave, { referencia: evento.target.value })
                  }
                />

                <SelectField
                  label="Pagamento"
                  value={linha.formaDePagamento}
                  onChange={(evento) =>
                    alterar(linha.chave, {
                      formaDePagamento: evento.target
                        .value as FormaDePagamentoDoRecibo,
                    })
                  }
                >
                  {FORMAS_DE_PAGAMENTO_DO_RECIBO.map((forma) => (
                    <option key={forma} value={forma}>
                      {ROTULOS_DE_FORMA_DO_RECIBO[forma]}
                    </option>
                  ))}
                </SelectField>

                <TextField
                  label="Referência do pagamento"
                  hint="NSU da maquininha, id do PIX, nº do boleto."
                  value={linha.referenciaDoPagamento}
                  onChange={(evento) =>
                    alterar(linha.chave, {
                      referenciaDoPagamento: evento.target.value,
                    })
                  }
                />

                <TextField
                  label="Valor"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={linha.valor}
                  onChange={(evento) =>
                    alterar(linha.chave, { valor: evento.target.value })
                  }
                />
              </div>
            </div>
          ))}

          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLinhas((atuais) => [...atuais, linhaNova()])}
            >
              <Plus className="size-4" aria-hidden />
              Adicionar item
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <TextAreaField
          label="Observação"
          rows={3}
          hint="Sai impressa no recibo."
          value={observacoes}
          onChange={(evento) => setObservacoes(evento.target.value)}
        />

        <div className="border-line mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div>
            <span className="text-ink-muted text-sm">Total do recibo</span>
            <p className="text-ink text-2xl font-semibold tabular-nums">
              {formatCurrency(total)}
            </p>
          </div>

          <Button onClick={emitir} loading={emitindo}>
            Emitir recibo
          </Button>
        </div>

        <p className="text-ink-muted mt-3 text-xs">
          Confira antes: recibo emitido não se edita. Se sair errado, ele é
          cancelado com motivo e outro é emitido no lugar.
        </p>
      </Card>
    </div>
  );
}
