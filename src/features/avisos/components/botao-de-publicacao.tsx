"use client";

import { EyeOff, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { alterarPublicacao } from "@/features/avisos/actions/avisos";

/**
 * Tira do ar ou republica.
 *
 * Não há exclusão: o que foi comunicado à comunidade fica registrado.
 */
export function BotaoDePublicacao({
  id,
  ativo,
}: {
  id: string;
  ativo: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar() {
    setErro(null);
    setOcupado(true);

    try {
      const resultado = await alterarPublicacao(id, !ativo);
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível alterar.");
        return;
      }
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="secondary" onClick={alternar} loading={ocupado}>
        {ativo ? (
          <>
            <EyeOff className="size-4" aria-hidden />
            Tirar do ar
          </>
        ) : (
          <>
            <Eye className="size-4" aria-hidden />
            Publicar de novo
          </>
        )}
      </Button>

      {erro && (
        <p role="alert" className="text-danger text-sm">
          {erro}
        </p>
      )}
    </div>
  );
}
