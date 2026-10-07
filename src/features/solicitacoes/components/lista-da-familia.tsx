"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatDate } from "@/core/lib/format";
import { ROTULOS_DE_TIPO_DE_SOLICITACAO } from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { mudarSituacao } from "@/features/solicitacoes/actions/solicitacoes";
import { podeMover } from "@/features/solicitacoes/domain/fila";
import { Situacao } from "@/features/solicitacoes/components/situacao";
import type { SolicitacaoComId } from "@/features/solicitacoes/services/solicitacoes.server";

/**
 * Os pedidos da família.
 *
 * Mostra o último passo da fila com data, e não só a situação: "em
 * andamento" sem dizer desde quando é a informação que faz a família ligar
 * para perguntar.
 */
export function ListaDaFamilia({
  solicitacoes,
}: {
  solicitacoes: SolicitacaoComId[];
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function cancelar(id: string) {
    setErro(null);
    setOcupado(id);

    try {
      const resultado = await mudarSituacao({
        id,
        situacao: "cancelada",
        motivo: null,
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível cancelar.");
        return;
      }
      router.refresh();
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

      <ul className="flex flex-col gap-3">
        {solicitacoes.map((solicitacao) => {
          const ultimo = solicitacao.historico?.at(-1);
          const podeCancelar = podeMover(
            solicitacao.situacao,
            "cancelada",
            "familia",
          );

          return (
            <li
              key={solicitacao.id}
              className="rounded-card border-line bg-surface border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-ink font-medium">
                    {solicitacao.tipo === "documentacao"
                      ? solicitacao.documentoNome
                      : ROTULOS_DE_TIPO_DE_SOLICITACAO[solicitacao.tipo]}
                  </p>
                  <p className="text-ink-muted mt-0.5 text-sm">
                    {solicitacao.alunoNome}
                    {solicitacao.turmaCodigo
                      ? ` · ${solicitacao.turmaCodigo}`
                      : ""}
                    {" · pedido em "}
                    {formatDate(solicitacao.abertaEm)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Situacao situacao={solicitacao.situacao} />
                  {podeCancelar && (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={ocupado === solicitacao.id}
                      onClick={() => cancelar(solicitacao.id)}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>

              {solicitacao.observacoes && (
                <p className="text-ink-muted mt-2 text-sm">
                  {solicitacao.observacoes}
                </p>
              )}

              {/* O motivo da recusa é a única coisa que a família precisa
                  ler para entender o "não" — fica em destaque. */}
              {ultimo?.motivo && (
                <p className="border-line text-ink mt-3 border-t pt-2 text-sm">
                  <span className="text-ink-muted">
                    Resposta da secretaria:{" "}
                  </span>
                  {ultimo.motivo}
                </p>
              )}

              {ultimo && solicitacao.situacao !== "aberta" && (
                <p className="text-ink-muted mt-2 text-xs">
                  Atualizado em {formatDate(ultimo.em)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
