"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { TextAreaField } from "@/core/ui/field";
import { Modal } from "@/core/ui/modal";
import { cancelarRecibo } from "@/features/recibos/actions/recibos";

/**
 * Cancelamento de recibo.
 *
 * Atrás de um modal com motivo obrigatório, e não de um botão direto:
 * cancelar é o único jeito de corrigir um recibo, e o número cancelado não
 * volta. Quem cancela raramente está por perto quando a dúvida chega no
 * fechamento do caixa — o motivo responde por ela.
 */
export function CancelarRecibo({ id }: { id: string }) {
  const router = useRouter();

  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  async function confirmar() {
    setErro(null);
    setCancelando(true);

    try {
      const resultado = await cancelarRecibo({ id, motivo });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível cancelar.");
        return;
      }

      setAberto(false);
      setMotivo("");
      router.refresh();
    } finally {
      setCancelando(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        data-impressao="ocultar"
        onClick={() => setAberto(true)}
      >
        <Ban className="size-4" aria-hidden />
        Cancelar recibo
      </Button>

      <Modal
        open={aberto}
        title="Cancelar recibo"
        onClose={() => setAberto(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAberto(false)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              onClick={confirmar}
              loading={cancelando}
              disabled={motivo.trim().length < 3}
            >
              Cancelar recibo
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 px-4 py-4">
          {erro && (
            <p
              role="alert"
              className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
            >
              {erro}
            </p>
          )}

          <p className="text-ink-muted text-sm">
            O recibo continua no histórico, marcado como cancelado, e o número
            não é reaproveitado — é o buraco na sequência que prova, na
            conferência, que ele foi anulado.
          </p>

          <TextAreaField
            label="Motivo"
            rows={3}
            required
            hint="Aparece no recibo e no histórico."
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
          />
        </div>
      </Modal>
    </>
  );
}
