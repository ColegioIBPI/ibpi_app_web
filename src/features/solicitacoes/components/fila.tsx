"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatDate } from "@/core/lib/format";
import {
  ROTULOS_DE_SOLICITACAO,
  ROTULOS_DE_TIPO_DE_SOLICITACAO,
  type SituacaoDaSolicitacao,
} from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { TextField } from "@/core/ui/field";
import { Modal } from "@/core/ui/modal";
import { mudarSituacao } from "@/features/solicitacoes/actions/solicitacoes";
import {
  exigeMotivo,
  proximasSituacoes,
} from "@/features/solicitacoes/domain/fila";
import {
  DetalheDaSolicitacao,
  tituloDaSolicitacao,
} from "@/features/solicitacoes/components/detalhe";
import { Situacao } from "@/features/solicitacoes/components/situacao";
import type { SolicitacaoComId } from "@/features/solicitacoes/services/solicitacoes.server";

/**
 * A fila de atendimento.
 *
 * Cada linha oferece **só os passos válidos a partir de onde ela está** —
 * os botões vêm da mesma função pura que o servidor usa para aceitar ou
 * recusar a mudança. Oferecer na tela um passo que a ação vai negar é uma
 * armadilha.
 */
export function FilaDeSolicitacoes({
  solicitacoes,
}: {
  solicitacoes: SolicitacaoComId[];
}) {
  const router = useRouter();
  const [recusando, setRecusando] = useState<SolicitacaoComId | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function mover(
    id: string,
    situacao: SituacaoDaSolicitacao,
    motivo: string | null = null,
  ) {
    setErro(null);
    setOcupado(id);

    try {
      const resultado = await mudarSituacao({ id, situacao, motivo });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível atualizar.");
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

      <ul className="flex flex-col gap-3">
        {solicitacoes.map((solicitacao) => {
          const passos = proximasSituacoes(
            solicitacao.tipo,
            solicitacao.situacao,
            "escola",
          );
          const ultimo = solicitacao.historico?.at(-1);

          return (
            <li
              key={solicitacao.id}
              className="rounded-card border-line bg-surface border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-ink-muted text-xs">
                    {ROTULOS_DE_TIPO_DE_SOLICITACAO[solicitacao.tipo]}
                  </p>
                  {/* O título é o que foi pedido, não a categoria: numa fila
                      de documentação, "Documentação" em toda linha não
                      distingue nada. */}
                  <p className="text-ink font-medium">
                    {tituloDaSolicitacao(solicitacao)}
                  </p>
                  <p className="text-ink-muted mt-0.5 text-sm">
                    {solicitacao.alunoNome}
                    {solicitacao.turmaCodigo
                      ? ` · ${solicitacao.turmaCodigo}`
                      : ""}
                    {" · pedido por "}
                    {solicitacao.solicitanteNome}
                    {" em "}
                    {formatDate(solicitacao.abertaEm)}
                  </p>
                </div>

                <Situacao situacao={solicitacao.situacao} />
              </div>

              <DetalheDaSolicitacao solicitacao={solicitacao} />

              {solicitacao.observacoes && (
                <p className="text-ink-muted mt-2 text-sm">
                  {solicitacao.observacoes}
                </p>
              )}

              {ultimo?.motivo && (
                <p className="text-ink-muted mt-2 text-sm">
                  Motivo: {ultimo.motivo}
                </p>
              )}

              {passos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {passos.map((passo) => (
                    <Button
                      key={passo}
                      size="sm"
                      variant={passo === "recusada" ? "ghost" : "secondary"}
                      loading={ocupado === solicitacao.id}
                      onClick={() =>
                        exigeMotivo(passo)
                          ? setRecusando(solicitacao)
                          : mover(solicitacao.id, passo)
                      }
                    >
                      {ROTULOS_DE_SOLICITACAO[passo]}
                    </Button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {recusando && (
        <FormularioDeRecusa
          solicitacao={recusando}
          ocupado={ocupado === recusando.id}
          onCancelar={() => setRecusando(null)}
          onConfirmar={async (motivo) => {
            const ok = await mover(recusando.id, "recusada", motivo);
            if (ok) setRecusando(null);
          }}
        />
      )}
    </div>
  );
}

function FormularioDeRecusa({
  solicitacao,
  ocupado,
  onCancelar,
  onConfirmar,
}: {
  solicitacao: SolicitacaoComId;
  ocupado: boolean;
  onCancelar: () => void;
  onConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");

  return (
    <Modal
      open
      title="Recusar pedido"
      onClose={onCancelar}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancelar}>
            Voltar
          </Button>
          <Button
            loading={ocupado}
            disabled={motivo.trim().length === 0}
            onClick={() => onConfirmar(motivo.trim())}
          >
            Recusar
          </Button>
        </div>
      }
    >
      <p className="text-ink-muted mb-3 text-sm">
        {solicitacao.alunoNome}
        {solicitacao.tipo === "documentacao"
          ? ` · ${solicitacao.documentoNome}`
          : ""}
      </p>

      <TextField
        label="Motivo"
        required
        hint="A família vai ler. Recusa sem explicação vira telefonema para a secretaria."
        value={motivo}
        onChange={(evento) => setMotivo(evento.target.value)}
      />
    </Modal>
  );
}
