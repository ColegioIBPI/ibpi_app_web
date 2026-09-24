"use client";

import { Printer } from "lucide-react";

import { Button } from "@/core/ui/button";

/**
 * Impressão do boletim.
 *
 * Usa a impressão do próprio navegador — que já oferece "Salvar como PDF" em
 * todos eles. Gerar o PDF no servidor exigiria uma biblioteca de layout e
 * uma segunda descrição do boletim para manter em sincronia com a tela; com
 * o `@media print` do `globals.css`, o que a família imprime é exatamente o
 * que ela vê.
 */
export function BotaoDeImpressao() {
  return (
    <Button
      variant="secondary"
      data-impressao="ocultar"
      onClick={() => window.print()}
    >
      <Printer className="size-4" aria-hidden />
      Imprimir / PDF
    </Button>
  );
}
