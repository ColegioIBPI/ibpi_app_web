import { Download } from "lucide-react";

import { cn } from "@/core/lib/cn";

/**
 * Baixa uma planilha de uma rota de exportação.
 *
 * É uma âncora com `download`, e não um botão com JavaScript: o navegador já
 * sabe baixar arquivo, e assim o link funciona antes de o JavaScript
 * carregar — o que importa numa secretaria com internet ruim.
 *
 * Sai da impressão: planilha é para abrir no Excel, não para sair no papel.
 */
export function BotaoDeExportacao({
  href,
  rotulo = "Exportar para Excel",
  className,
}: {
  href: string;
  rotulo?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      download
      data-impressao="ocultar"
      className={cn(
        "border-line bg-surface text-ink hover:bg-surface-subtle inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium",
        className,
      )}
    >
      <Download className="size-4" aria-hidden />
      {rotulo}
    </a>
  );
}
