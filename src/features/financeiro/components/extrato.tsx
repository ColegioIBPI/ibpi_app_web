"use client";

import { Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/core/lib/cn";
import { formatCurrency, formatDate } from "@/core/lib/format";
import { ROTULOS_DE_COBRANCA, type SituacaoDaCobranca } from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { Modal } from "@/core/ui/modal";
import { TextField } from "@/core/ui/field";
import { EmptyState } from "@/core/ui/states";
import {
  darBaixa,
  desfazerBaixa,
  editarCobranca,
  removerCobranca,
} from "@/features/financeiro/actions/financeiro";
import {
  diasDeAtraso,
  pagaParcialmente,
  saldo,
} from "@/features/financeiro/domain/cobranca";
import type { CobrancaComId } from "@/features/financeiro/services/financeiro.server";

interface ExtratoProps {
  cobrancas: CobrancaComId[];
  /** `false` para secretaria, coordenação e responsável: leitura apenas. */
  podeLancar: boolean;
}

/**
 * Extrato de parcelas de um aluno.
 *
 * A situação de cada linha chega calculada do servidor — "vencida" é uma
 * conclusão sobre hoje, não um dado gravado.
 */
export function Extrato({ cobrancas, podeLancar }: ExtratoProps) {
  const router = useRouter();
  const [baixando, setBaixando] = useState<CobrancaComId | null>(null);
  const [editando, setEditando] = useState<CobrancaComId | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function executar(
    chave: string,
    acao: () => Promise<{ ok: boolean; erro?: string }>,
  ) {
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

  if (cobrancas.length === 0) {
    return (
      <EmptyState
        title="Nenhuma parcela registrada"
        description={
          podeLancar
            ? "Gere um carnê a partir de um plano de pagamento."
            : "Nada foi lançado para este aluno."
        }
      />
    );
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <caption className="sr-only">Parcelas do aluno</caption>
          <thead>
            <tr className="border-line border-b text-left">
              <th scope="col" className="text-ink-muted py-2 pr-3 font-medium">
                Parcela
              </th>
              <th scope="col" className="text-ink-muted py-2 pr-3 font-medium">
                Vencimento
              </th>
              <th scope="col" className="text-ink-muted py-2 pr-3 text-right font-medium">
                Valor
              </th>
              <th scope="col" className="text-ink-muted py-2 pr-3 text-right font-medium">
                Pago
              </th>
              <th scope="col" className="text-ink-muted py-2 pr-3 font-medium">
                Situação
              </th>
              <th scope="col" className="text-ink-muted py-2 font-medium">
                {podeLancar ? "Ações" : "Observações"}
              </th>
            </tr>
          </thead>

          <tbody className="divide-line divide-y">
            {cobrancas.map((cobranca) => {
              const atraso = diasDeAtraso(cobranca);
              const devido = saldo(cobranca);

              return (
                <tr key={cobranca.id}>
                  <th scope="row" className="text-ink py-2 pr-3 text-left font-normal tabular-nums">
                    {cobranca.parcela && cobranca.totalDeParcelas
                      ? `${cobranca.parcela}/${cobranca.totalDeParcelas}`
                      : "—"}
                  </th>

                  <td className="text-ink py-2 pr-3 tabular-nums whitespace-nowrap">
                    {formatDate(cobranca.vencimento)}
                    {atraso > 0 && (
                      <span className="text-danger block text-xs">
                        {atraso} {atraso === 1 ? "dia" : "dias"} de atraso
                      </span>
                    )}
                  </td>

                  <td className="text-ink py-2 pr-3 text-right tabular-nums">
                    {cobranca.valor === null
                      ? "—"
                      : formatCurrency(cobranca.valor)}
                  </td>

                  <td className="py-2 pr-3 text-right tabular-nums">
                    {cobranca.dataPagamento ? (
                      <>
                        <span className="text-ink">
                          {formatCurrency(cobranca.valorPago ?? 0)}
                        </span>
                        <span className="text-ink-muted block text-xs">
                          {formatDate(cobranca.dataPagamento)}
                          {cobranca.banco ? ` · ${cobranca.banco}` : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>

                  <td className="py-2 pr-3">
                    <Situacao situacao={cobranca.situacaoAtual} />
                    {pagaParcialmente(cobranca) && (
                      <span className="text-warning block text-xs">
                        falta {formatCurrency(devido)}
                      </span>
                    )}
                  </td>

                  <td className="py-2">
                    {podeLancar ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {cobranca.dataPagamento ? (
                          <button
                            type="button"
                            aria-label={`Desfazer baixa da parcela de ${formatDate(cobranca.vencimento)}`}
                            disabled={ocupado === cobranca.id}
                            onClick={() =>
                              executar(cobranca.id, () =>
                                desfazerBaixa(cobranca.id),
                              )
                            }
                            className="text-ink-muted hover:text-ink rounded-md p-1 disabled:opacity-50"
                          >
                            <Undo2 className="size-4" aria-hidden />
                          </button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setBaixando(cobranca)}
                          >
                            Dar baixa
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditando(cobranca)}
                        >
                          Editar
                        </Button>

                        {!cobranca.dataPagamento && (
                          <button
                            type="button"
                            aria-label={`Apagar parcela de ${formatDate(cobranca.vencimento)}`}
                            disabled={ocupado === cobranca.id}
                            onClick={() =>
                              executar(cobranca.id, () =>
                                removerCobranca(cobranca.id),
                              )
                            }
                            className="text-ink-muted hover:text-danger rounded-md p-1 disabled:opacity-50"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-ink-muted">
                        {cobranca.observacoes ?? "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {baixando && (
        <FormularioDeBaixa
          cobranca={baixando}
          ocupado={ocupado === "baixa"}
          onCancelar={() => setBaixando(null)}
          onConfirmar={async (dados) => {
            const ok = await executar("baixa", () => darBaixa(dados));
            if (ok) setBaixando(null);
          }}
        />
      )}

      {editando && (
        <FormularioDeEdicao
          cobranca={editando}
          ocupado={ocupado === "edicao"}
          onCancelar={() => setEditando(null)}
          onConfirmar={async (dados) => {
            const ok = await executar("edicao", () => editarCobranca(dados));
            if (ok) setEditando(null);
          }}
        />
      )}
    </div>
  );
}

const CORES: Record<SituacaoDaCobranca, string> = {
  aberta: "bg-surface-subtle text-ink-muted",
  paga: "bg-success-surface text-success",
  vencida: "bg-danger-surface text-danger",
};

function Situacao({ situacao }: { situacao: SituacaoDaCobranca }) {
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2 py-1 text-xs font-medium",
        CORES[situacao],
      )}
    >
      {ROTULOS_DE_COBRANCA[situacao]}
    </span>
  );
}

interface DadosDaBaixa {
  id: string;
  dataPagamento: string;
  valorPago: number;
  banco: string | null;
  recibo: string | null;
  observacoes: string | null;
}

function FormularioDeBaixa({
  cobranca,
  ocupado,
  onCancelar,
  onConfirmar,
}: {
  cobranca: CobrancaComId;
  ocupado: boolean;
  onCancelar: () => void;
  onConfirmar: (dados: DadosDaBaixa) => void;
}) {
  const [data, setData] = useState(hojeISO());
  // Começa no valor devido: na esmagadora maioria a família paga o que deve,
  // e digitar de novo um número que já está na tela só cria erro.
  const [valor, setValor] = useState(String(cobranca.valor ?? 0));
  const [banco, setBanco] = useState(cobranca.banco ?? "");
  const [recibo, setRecibo] = useState(cobranca.recibo ?? "");
  const [observacoes, setObservacoes] = useState(cobranca.observacoes ?? "");

  return (
    <Modal
      open
      title={`Baixa da parcela de ${formatDate(cobranca.vencimento)}`}
      onClose={onCancelar}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button
            loading={ocupado}
            onClick={() =>
              onConfirmar({
                id: cobranca.id,
                dataPagamento: data,
                valorPago: Number(valor.replace(",", ".")) || 0,
                banco: banco.trim() || null,
                recibo: recibo.trim() || null,
                observacoes: observacoes.trim() || null,
              })
            }
          >
            Registrar pagamento
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Data do pagamento"
          type="date"
          value={data}
          onChange={(evento) => setData(evento.target.value)}
        />
        <TextField
          label="Valor pago"
          inputMode="decimal"
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          hint={`Devido: ${formatCurrency(cobranca.valor ?? 0)}`}
        />
        <TextField
          label="Banco"
          placeholder="Ex.: ITAÚ"
          value={banco}
          onChange={(evento) => setBanco(evento.target.value)}
        />
        <TextField
          label="Recibo"
          placeholder="Ex.: 00042981"
          value={recibo}
          onChange={(evento) => setRecibo(evento.target.value)}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Observações"
            value={observacoes}
            onChange={(evento) => setObservacoes(evento.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

function FormularioDeEdicao({
  cobranca,
  ocupado,
  onCancelar,
  onConfirmar,
}: {
  cobranca: CobrancaComId;
  ocupado: boolean;
  onCancelar: () => void;
  onConfirmar: (dados: {
    id: string;
    vencimento: string;
    valor: number;
    observacoes: string | null;
  }) => void;
}) {
  const [vencimento, setVencimento] = useState(cobranca.vencimento);
  const [valor, setValor] = useState(String(cobranca.valor ?? 0));
  const [observacoes, setObservacoes] = useState(cobranca.observacoes ?? "");

  return (
    <Modal
      open
      title="Editar parcela"
      onClose={onCancelar}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button
            loading={ocupado}
            onClick={() =>
              onConfirmar({
                id: cobranca.id,
                vencimento,
                valor: Number(valor.replace(",", ".")) || 0,
                observacoes: observacoes.trim() || null,
              })
            }
          >
            Salvar
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Vencimento"
          type="date"
          value={vencimento}
          onChange={(evento) => setVencimento(evento.target.value)}
        />
        <TextField
          label="Valor"
          inputMode="decimal"
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Observações"
            value={observacoes}
            onChange={(evento) => setObservacoes(evento.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${agora.getFullYear()}-${mes}-${dia}`;
}
