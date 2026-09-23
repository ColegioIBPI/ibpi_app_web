"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/core/lib/cn";
import { TRIMESTRES, type Trimestre } from "@/core/modelo";

/** Trimestre do diário, guardado na URL para o link ser compartilhável. */
export function SeletorDeTrimestre({ atual }: { atual: Trimestre }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function abrir(trimestre: Trimestre) {
    const parametros = new URLSearchParams(searchParams.toString());
    parametros.set("trimestre", String(trimestre));

    startTransition(() => {
      router.replace(`${pathname}?${parametros.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      role="group"
      aria-label="Trimestre"
      className="border-line inline-flex rounded-md border p-0.5"
    >
      {TRIMESTRES.map((trimestre) => (
        <button
          key={trimestre}
          type="button"
          aria-pressed={trimestre === atual}
          onClick={() => abrir(trimestre)}
          className={cn(
            "rounded px-3 py-1.5 text-sm",
            trimestre === atual
              ? "bg-brand-600 font-medium text-white"
              : "text-ink-muted hover:bg-surface-subtle",
          )}
        >
          {trimestre}º trimestre
        </button>
      ))}
    </div>
  );
}
