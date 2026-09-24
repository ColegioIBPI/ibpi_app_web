"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { formatCurrency, formatDate } from "@/core/lib/format";
import { ROTULOS_DE_CONTRATO, type TipoDeContrato } from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { SelectField, TextField } from "@/core/ui/field";
import { criarPlanoDePagamento } from "@/features/financeiro/actions/financeiro";
import {
  gerarParcelas,
  somarParcelas,
} from "@/features/financeiro/domain/plano";

/**
 * Plano de pagamento: gera o carnê.
 *
 * A prévia é calculada na tela, com a mesma função pura que o servidor usa
 * para gravar. A secretaria confere o carnê antes de abrir — corrigir um
 * plano de doze parcelas depois de criado dá muito mais trabalho que olhar
 * a lista uma vez.
 */
export function NovoPlano({ matricula }: { matricula: string }) {
  const router = useRouter();

  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState("12");
  const [primeiroVencimento, setPrimeiroVencimento] = useState("");
  const [tipo, setTipo] = useState<TipoDeContrato>("anuidade");
  const [observacoes, setObservacoes] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const previa = useMemo(
    () =>
      gerarParcelas({
        valor: Number(valor.replace(/\./g, "").replace(",", ".")) || 0,
        parcelas: Number(parcelas) || 0,
        primeiroVencimento,
      }),
    [valor, parcelas, primeiroVencimento],
  );

  async function criar() {
    setErro(null);
    setAviso(null);

    if (previa.erro) {
      setErro(previa.erro);
      return;
    }

    setSalvando(true);

    try {
      const resultado = await criarPlanoDePagamento({
        matricula,
        valor: Number(valor.replace(/\./g, "").replace(",", ".")),
        parcelas: Number(parcelas),
        primeiroVencimento,
        tipo,
        observacoes: observacoes.trim() || null,
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível gerar o carnê.");
        return;
      }

      setAviso(
        `${resultado.parcelas} ${resultado.parcelas === 1 ? "parcela criada" : "parcelas criadas"}.`,
      );
      setValor("");
      setPrimeiroVencimento("");
      setObservacoes("");
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Valor total"
          inputMode="decimal"
          placeholder="1923,00"
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
        />
        <TextField
          label="Parcelas"
          type="number"
          min={1}
          max={24}
          value={parcelas}
          onChange={(evento) => setParcelas(evento.target.value)}
        />
        <TextField
          label="1º vencimento"
          type="date"
          value={primeiroVencimento}
          onChange={(evento) => setPrimeiroVencimento(evento.target.value)}
        />
        <SelectField
          label="Tipo"
          value={tipo}
          onChange={(evento) =>
            setTipo(evento.target.value as TipoDeContrato)
          }
        >
          {Object.entries(ROTULOS_DE_CONTRATO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </SelectField>
      </div>

      <TextField
        label="Observações"
        value={observacoes}
        onChange={(evento) => setObservacoes(evento.target.value)}
      />

      {previa.parcelas.length > 0 && (
        <div className="border-line rounded-md border p-3">
          <p className="text-ink mb-2 text-sm font-medium">
            Prévia do carnê — {previa.parcelas.length}{" "}
            {previa.parcelas.length === 1 ? "parcela" : "parcelas"}, somando{" "}
            {formatCurrency(somarParcelas(previa.parcelas))}
          </p>

          <ul className="text-ink-muted grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {previa.parcelas.map((parcela) => (
              <li
                key={parcela.parcela}
                className="flex justify-between tabular-nums"
              >
                <span>
                  {parcela.parcela}/{parcela.totalDeParcelas} ·{" "}
                  {formatDate(parcela.vencimento)}
                </span>
                <span>{formatCurrency(parcela.valor)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={criar}
          loading={salvando}
          disabled={previa.parcelas.length === 0}
        >
          Gerar carnê
        </Button>
      </div>
    </div>
  );
}
