"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { TextField } from "@/core/ui/field";
import {
  removerDocumento,
  salvarDocumento,
} from "@/features/documentos/actions/documentos";
import type { DocumentoComId } from "@/features/documentos/services/documentos.server";

/**
 * Cadastro de um documento do catálogo.
 *
 * O mesmo formulário cria e corrige: os campos são os mesmos, e manter duas
 * telas quase iguais é como uma delas ganha um campo que a outra não tem.
 */
export function FormularioDeDocumento({
  documento,
}: {
  documento?: DocumentoComId;
}) {
  const router = useRouter();

  const [nome, setNome] = useState(documento?.nome ?? "");
  const [descricao, setDescricao] = useState(documento?.descricao ?? "");
  const [prazo, setPrazo] = useState(
    documento?.prazoEmDiasUteis === null ||
      documento?.prazoEmDiasUteis === undefined
      ? ""
      : String(documento.prazoEmDiasUteis),
  );
  const [valor, setValor] = useState(
    documento?.valor === null || documento?.valor === undefined
      ? ""
      : String(documento.valor),
  );
  const [exigeComprovante, setExigeComprovante] = useState(
    documento?.exigeComprovante ?? false,
  );
  const [ordem, setOrdem] = useState(String(documento?.ordem ?? 0));

  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

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
        return;
      }

      router.push("/gestao/documentos");
      router.refresh();
    } finally {
      setOcupado(null);
    }
  }

  const salvar = () =>
    executar("salvar", () =>
      salvarDocumento({
        id: documento?.id,
        nome,
        descricao: descricao.trim() || null,
        prazoEmDiasUteis: prazo.trim() === "" ? null : Number(prazo),
        valor: valor.trim() === "" ? null : paraReais(valor),
        exigeComprovante,
        ordem: Number(ordem) || 0,
      }),
    );

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

      <Card title="O documento">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              label="Nome"
              required
              placeholder="Ex.: Declaração de matrícula"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <TextField
              label="Descrição"
              hint="Uma linha sobre para que serve. Ajuda quem não conhece o nome formal."
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
            />
          </div>

          <TextField
            label="Prazo de entrega"
            type="number"
            min={0}
            placeholder="2"
            hint="Em dias úteis. Em branco = sem prazo definido."
            value={prazo}
            onChange={(evento) => setPrazo(evento.target.value)}
          />

          <TextField
            label="Valor"
            inputMode="decimal"
            placeholder="0,00"
            hint="Em branco = gratuito."
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
          />

          <TextField
            label="Ordem"
            type="number"
            hint="Menor aparece primeiro. Use de 10 em 10."
            value={ordem}
            onChange={(evento) => setOrdem(evento.target.value)}
          />
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="border-line mt-0.5 size-4 rounded"
            checked={exigeComprovante}
            onChange={(evento) => setExigeComprovante(evento.target.checked)}
          />
          <span>
            <span className="text-ink">Exigir comprovante de pagamento</span>
            <span className="text-ink-muted block text-xs">
              O pedido só é aceito com o comprovante anexado. Deixe desmarcado
              quando a família paga na secretaria.
            </span>
          </span>
        </label>
      </Card>

      <div className="flex items-center justify-between gap-2">
        {documento ? (
          <Button
            variant="ghost"
            loading={ocupado === "remover"}
            onClick={() =>
              executar("remover", () => removerDocumento(documento.id))
            }
          >
            Apagar
          </Button>
        ) : (
          <span />
        )}

        <Button onClick={salvar} loading={ocupado === "salvar"}>
          {documento ? "Salvar alterações" : "Cadastrar"}
        </Button>
      </div>
    </div>
  );
}

/** `12,50` e `12.50` chegam do mesmo teclado; os dois viram 12.5. */
function paraReais(texto: string): number {
  return Number(texto.replace(/\./g, "").replace(",", ".")) || 0;
}
