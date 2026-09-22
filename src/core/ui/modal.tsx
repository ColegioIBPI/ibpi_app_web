"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/core/lib/cn";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Usa o `<dialog>` nativo: foco preso, Escape e camada de fundo vêm do
 * navegador, sem reimplementar acessibilidade à mão.
 */
export function Modal({
  open,
  title,
  onClose,
  className,
  children,
  footer,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="modal-title"
      className={cn(
        "rounded-card border-line bg-surface text-ink m-auto w-[min(32rem,calc(100vw-2rem))] border p-0",
        "backdrop:bg-ink/40",
        className,
      )}
    >
      <header className="border-line flex items-start justify-between gap-4 border-b px-4 py-3">
        <h2 id="modal-title" className="text-base font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="text-ink-muted hover:bg-surface-subtle rounded-md p-1"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div className="px-4 py-4">{children}</div>

      {footer && (
        <footer className="border-line flex justify-end gap-2 border-t px-4 py-3">
          {footer}
        </footer>
      )}
    </dialog>
  );
}
