"use client";

import { Plus, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/core/lib/cn";
import { formatCurrency, formatDate } from "@/core/lib/format";
import {
  ROTULOS_DE_COBRANCA,
  ROTULOS_DE_FORMA_DE_PAGAMENTO,
  ROTULOS_DE_TIPO_DE_COBRANCA,
  type FormaDePagamento,
  type SituacaoDaCobranca,
  type TipoDeCobranca,
} from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { SelectField, TextField } from "@/core/ui/field";
import { Modal } from "@/core/ui/modal";
import { EmptyState } from "@/core/ui/states";
import {
  confirmarPagamento,
  criarCobranca,
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
  matricula: string;
  cobrancas: CobrancaComId[];
  /** `false` para secretaria, coordenação e responsável: leitura apenas. */
  podeLancar: boolean;
}

/**
 * Extrato de parcelas de um aluno.
 *
 * A situação de cada linha chega calculada do servidor — "vencida" é uma
 * conclusão sobre hoje, não um dado gravado.
 *
 * As colunas seguem o carnê que a secretaria já usa: vencimento, o que está
 * sendo cobrado, a parcela, o valor, e do lado do pagamento a data, o valor
 * pago, a forma, o recibo e a conferência.
 */
export function Extrato({ matricula, cobrancas, podeLancar }: ExtratoProps) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
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

      {podeLancar && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCriando(true)}
          >
            <Plus className="size-4" aria-hidden />
            Nova parcela
          </Button>
        </div>
      )}

      {cobrancas.length === 0 ? (
        <EmptyState
          title="Nenhuma parcela registrada"
          description={
            podeLancar
              ? "Cadastre uma parcela ou gere um carnê a partir de um plano de pagamento."
              : "Nada foi lançado para este aluno."
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[68rem] border-collapse text-sm">
            <caption className="sr-only">Parcelas do aluno</caption>
            <thead>
              <tr className="border-line border-b text-left">
                <Cabecalho>Vencimento</Cabecalho>
                <Cabecalho>Descrição</Cabecalho>
                <Cabecalho>Parcela</Cabecalho>
                <Cabecalho alinhamento="right">Valor</Cabecalho>
                <Cabecalho>Pagamento</Cabecalho>
                <Cabecalho alinhamento="right">Valor pago</Cabecalho>
                <Cabecalho>Forma</Cabecalho>
                <Cabecalho>Recibo</Cabecalho>
                <Cabecalho>Observações</Cabecalho>
                <Cabecalho alinhamento="center">Conf.</Cabecalho>
                <Cabecalho>Situação</Cabecalho>
                {podeLancar && <Cabecalho>Ações</Cabecalho>}
              </tr>
            </thead>

            <tbody className="divide-line divide-y">
              {cobrancas.map((cobranca) => {
                const atraso = diasDeAtraso(cobranca);
                const devido = saldo(cobranca);

                return (
                  <tr key={cobranca.id}>
                    <th
                      scope="row"
                      className="text-ink py-2 pr-3 text-left font-normal whitespace-nowrap tabular-nums"
                    >
                      {formatDate(cobranca.vencimento)}
                      {atraso > 0 && (
                        <span className="text-danger block text-xs">
                          {atraso} {atraso === 1 ? "dia" : "dias"} de atraso
                        </span>
                      )}
                    </th>

                    <td className="text-ink py-2 pr-3">
                      {cobranca.tipo
                        ? ROTULOS_DE_TIPO_DE_COBRANCA[cobranca.tipo]
                        : "—"}
                    </td>

                    <td className="text-ink py-2 pr-3 whitespace-nowrap tabular-nums">
                      {cobranca.parcela && cobranca.totalDeParcelas
                        ? `${cobranca.parcela}/${cobranca.totalDeParcelas}`
                        : "—"}
                    </td>

                    <td className="text-ink py-2 pr-3 text-right tabular-nums">
                      {cobranca.valor === null
                        ? "—"
                        : formatCurrency(cobranca.valor)}
                    </td>

                    <td className="text-ink py-2 pr-3 whitespace-nowrap tabular-nums">
                      {cobranca.dataPagamento
                        ? formatDate(cobranca.dataPagamento)
                        : "—"}
                    </td>

                    <td className="py-2 pr-3 text-right tabular-nums">
                      {cobranca.dataPagamento ? (
                        <>
                          <span className="text-ink">
                            {formatCurrency(cobranca.valorPago ?? 0)}
                          </span>
                          {pagaParcialmente(cobranca) && (
                            <span className="text-warning block text-xs">
                              falta {formatCurrency(devido)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>

                    <td className="text-ink py-2 pr-3 whitespace-nowrap">
                      {cobranca.formaDePagamento
                        ? ROTULOS_DE_FORMA_DE_PAGAMENTO[
                            cobranca.formaDePagamento
                          ]
                        : // Parcela migrada não tem forma, mas às vezes tem o
                          // banco por onde entrou — é o que o Access guardava.
                          (cobranca.banco ?? "—")}
                    </td>

                    <td className="text-ink py-2 pr-3 tabular-nums">
                      {cobranca.recibo ?? "—"}
                    </td>

                    <td className="text-ink-muted max-w-[14rem] truncate py-2 pr-3">
                      <span title={cobranca.observacoes ?? undefined}>
                        {cobranca.observacoes ?? "—"}
                      </span>
                    </td>

                    <td className="py-2 pr-3 text-center">
                      <Confirmacao
                        cobranca={cobranca}
                        podeLancar={podeLancar}
                        ocupado={ocupado === `confirma-${cobranca.id}`}
                        onAlternar={(confirmado) =>
                          executar(`confirma-${cobranca.id}`, () =>
                            confirmarPagamento(cobranca.id, confirmado),
                          )
                        }
                      />
                    </td>

                    <td className="py-2 pr-3">
                      <Situacao situacao={cobranca.situacaoAtual} />
                    </td>

                    {podeLancar && (
                      <td className="py-2">
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
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {criando && (
        <FormularioDaParcela
          ocupado={ocupado === "nova"}
          onCancelar={() => setCriando(false)}
          onConfirmar={async (dados) => {
            const ok = await executar("nova", () =>
              criarCobranca({ ...dados, matricula }),
            );
            if (ok) setCriando(false);
          }}
        />
      )}

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
        <FormularioDaParcela
          cobranca={editando}
          ocupado={ocupado === "edicao"}
          onCancelar={() => setEditando(null)}
          onConfirmar={async (dados) => {
            const ok = await executar("edicao", () =>
              editarCobranca({ ...dados, id: editando.id }),
            );
            if (ok) setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function Cabecalho({
  children,
  alinhamento = "left",
}: {
  children: React.ReactNode;
  alinhamento?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "text-ink-muted py-2 pr-3 font-medium",
        alinhamento === "right" && "text-right",
        alinhamento === "center" && "text-center",
      )}
    >
      {children}
    </th>
  );
}

/**
 * A conferência do pagamento.
 *
 * Só aparece onde há pagamento: confirmar uma parcela que ninguém pagou não
 * quer dizer nada.
 */
function Confirmacao({
  cobranca,
  podeLancar,
  ocupado,
  onAlternar,
}: {
  cobranca: CobrancaComId;
  podeLancar: boolean;
  ocupado: boolean;
  onAlternar: (confirmado: boolean) => void;
}) {
  if (!cobranca.dataPagamento) {
    return <span className="text-ink-muted">—</span>;
  }

  // Ausente conta como confirmado: é o estado das parcelas migradas, que já
  // vieram quitadas do sistema antigo.
  const confirmado = cobranca.confirmado !== false;

  return (
    <input
      type="checkbox"
      className="border-line size-4 rounded disabled:opacity-50"
      checked={confirmado}
      disabled={!podeLancar || ocupado}
      aria-label={`Pagamento confirmado — parcela de ${formatDate(cobranca.vencimento)}`}
      onChange={(evento) => onAlternar(evento.target.checked)}
    />
  );
}

const CORES: Record<SituacaoDaCobranca, string> = {
  aberta: "bg-surface-subtle text-ink-muted",
  "a-confirmar": "bg-warning-surface text-warning",
  paga: "bg-success-surface text-success",
  vencida: "bg-danger-surface text-danger",
};

function Situacao({ situacao }: { situacao: SituacaoDaCobranca }) {
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap",
        CORES[situacao],
      )}
    >
      {ROTULOS_DE_COBRANCA[situacao]}
    </span>
  );
}

interface DadosDaParcela {
  vencimento: string;
  tipo: TipoDeCobranca;
  parcela: number | null;
  totalDeParcelas: number | null;
  valor: number;
  observacoes: string | null;
}

/**
 * Cadastro e correção de uma parcela.
 *
 * O mesmo formulário para as duas coisas: os campos são exatamente os
 * mesmos, e manter duas telas quase iguais é como uma delas ganha um campo
 * que a outra não tem.
 */
function FormularioDaParcela({
  cobranca,
  ocupado,
  onCancelar,
  onConfirmar,
}: {
  cobranca?: CobrancaComId;
  ocupado: boolean;
  onCancelar: () => void;
  onConfirmar: (dados: DadosDaParcela) => void;
}) {
  const [vencimento, setVencimento] = useState(
    cobranca?.vencimento ?? hojeISO(),
  );
  const [tipo, setTipo] = useState<TipoDeCobranca>(
    cobranca?.tipo ?? "mensalidade",
  );
  const [parcela, setParcela] = useState(String(cobranca?.parcela ?? ""));
  const [total, setTotal] = useState(String(cobranca?.totalDeParcelas ?? ""));
  const [valor, setValor] = useState(
    cobranca ? String(cobranca.valor ?? 0) : "",
  );
  const [observacoes, setObservacoes] = useState(cobranca?.observacoes ?? "");

  return (
    <Modal
      open
      title={cobranca ? "Editar parcela" : "Nova parcela"}
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
                vencimento,
                tipo,
                parcela: paraInteiro(parcela),
                totalDeParcelas: paraInteiro(total),
                valor: paraNumero(valor),
                observacoes: observacoes.trim() || null,
              })
            }
          >
            {cobranca ? "Salvar" : "Cadastrar"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Data de vencimento"
          type="date"
          value={vencimento}
          onChange={(evento) => setVencimento(evento.target.value)}
        />

        <SelectField
          label="Descrição do pagamento"
          value={tipo}
          onChange={(evento) => setTipo(evento.target.value as TipoDeCobranca)}
        >
          {Object.entries(ROTULOS_DE_TIPO_DE_COBRANCA).map(
            ([opcao, rotulo]) => (
              <option key={opcao} value={opcao}>
                {rotulo}
              </option>
            ),
          )}
        </SelectField>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Parcela"
            type="number"
            min={1}
            placeholder="1"
            value={parcela}
            onChange={(evento) => setParcela(evento.target.value)}
          />
          <TextField
            label="De"
            type="number"
            min={1}
            placeholder="12"
            hint="Deixe em branco para cobrança única."
            value={total}
            onChange={(evento) => setTotal(evento.target.value)}
          />
        </div>

        <TextField
          label="Valor da parcela"
          inputMode="decimal"
          placeholder="1923,00"
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

interface DadosDaBaixa {
  id: string;
  dataPagamento: string;
  valorPago: number;
  formaDePagamento: FormaDePagamento | null;
  recibo: string | null;
  observacoes: string | null;
  confirmado: boolean;
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
  const [forma, setForma] = useState<FormaDePagamento>("pix");
  const [recibo, setRecibo] = useState(cobranca.recibo ?? "");
  const [observacoes, setObservacoes] = useState(cobranca.observacoes ?? "");
  // Marcado por padrão: quem lança a baixa quase sempre está com o
  // comprovante na mão. Desmarcar é o caso raro — a família avisou que
  // pagou e o extrato ainda não chegou —, e por isso é a ação deliberada.
  const [confirmado, setConfirmado] = useState(true);

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
                valorPago: paraNumero(valor),
                formaDePagamento: forma,
                recibo: recibo.trim() || null,
                observacoes: observacoes.trim() || null,
                confirmado,
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

        <SelectField
          label="Tipo de pagamento"
          value={forma}
          onChange={(evento) =>
            setForma(evento.target.value as FormaDePagamento)
          }
        >
          {Object.entries(ROTULOS_DE_FORMA_DE_PAGAMENTO).map(
            ([opcao, rotulo]) => (
              <option key={opcao} value={opcao}>
                {rotulo}
              </option>
            ),
          )}
        </SelectField>

        <TextField
          label="Número do recibo"
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

        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            className="border-line size-4 rounded"
            checked={confirmado}
            onChange={(evento) => setConfirmado(evento.target.checked)}
          />
          <span className="text-ink">Pagamento confirmado</span>
          <span className="text-ink-muted text-xs">
            desmarque enquanto o dinheiro não aparecer no extrato
          </span>
        </label>
      </div>
    </Modal>
  );
}

/** `1.923,00` e `1923.00` chegam do mesmo teclado; os dois viram 1923. */
function paraNumero(texto: string): number {
  return Number(texto.replace(/\./g, "").replace(",", ".")) || 0;
}

function paraInteiro(texto: string): number | null {
  const numero = Number(texto);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${agora.getFullYear()}-${mes}-${dia}`;
}
