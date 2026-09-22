import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/core/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Desabilita e mostra o rótulo de carregamento. */
  loading?: boolean;
}

/*
 * O azul oficial #0098DA tem 3.2:1 sobre branco, abaixo do AA. O botão
 * primário usa brand-600 (4.6:1), que mantém a identidade e fica legível.
 */
const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-subtle",
  ghost: "text-brand-600 hover:bg-brand-50",
  danger: "bg-danger text-white hover:brightness-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? "Carregando…" : children}
    </button>
  );
}
