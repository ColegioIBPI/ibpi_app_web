"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { sair } from "@/features/auth/services/auth-client";

export function BotaoSair() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function onClick() {
    setSaindo(true);
    await sair();
    router.replace("/login");
    // Sem o refresh, a navegação seguinte pode vir do cache do cliente com os
    // dados de quem acabou de sair.
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saindo}
      className="text-ink-muted hover:bg-surface-subtle hover:text-ink inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm disabled:opacity-50"
    >
      <LogOut className="size-4" aria-hidden />
      {saindo ? "Saindo…" : "Sair"}
    </button>
  );
}
