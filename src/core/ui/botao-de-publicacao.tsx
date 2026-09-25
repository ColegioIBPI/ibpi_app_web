"use client";

import { EyeOff, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/core/ui/button";

/**
 * Tira do ar ou republica.
 *
 * Não há exclusão: o que foi comunicado à comunidade fica registrado. Avisos
 * e informações úteis seguem a mesma regra, e o botão recebe a ação de quem
 * o usa para não precisar conhecer as duas features.
 */

export interface ResultadoDaPublicacao {
  ok: boolean;
  erro?: string;
}

interface BotaoDePublicacaoProps {
  id: string;
  ativo: boolean;
  acao: (id: string, ativo: boolean) => Promise<ResultadoDaPublicacao>;
  rotulos?: { tirar: string; publicar: string };
}

export function BotaoDePublicacao({
  id,
  ativo,
  acao,
  rotulos = { tirar: "Tirar do ar", publicar: "Publicar de novo" },
}: BotaoDePublicacaoProps) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar() {
    setErro(null);
    setOcupado(true);

    try {
      const resultado = await acao(id, !ativo);
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
            {rotulos.tirar}
          </>
        ) : (
          <>
            <Eye className="size-4" aria-hidden />
            {rotulos.publicar}
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
