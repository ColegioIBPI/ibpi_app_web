import { cn } from "@/core/lib/cn";

/**
 * Primitivas de tabela.
 *
 * A secretaria trabalha em lista o dia inteiro, então a tabela é um
 * componente de primeira classe: cabeçalho fixo, linhas compactas e
 * rolagem horizontal no celular em vez de texto espremido.
 */

export function Table({
  caption,
  className,
  children,
}: {
  caption: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-surface-subtle text-ink-muted sticky top-0 text-left text-xs font-semibold tracking-wide uppercase">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-line divide-y">{children}</tbody>;
}

export function TableRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <tr className={cn("hover:bg-surface-subtle", className)}>{children}</tr>
  );
}

export function TableHeaderCell({
  className,
  children,
  scope = "col",
}: {
  className?: string;
  children: React.ReactNode;
  scope?: "col" | "row";
}) {
  return (
    <th scope={scope} className={cn("px-3 py-2 whitespace-nowrap", className)}>
      {children}
    </th>
  );
}

export function TableCell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <td className={cn("text-ink px-3 py-2", className)}>{children}</td>;
}
