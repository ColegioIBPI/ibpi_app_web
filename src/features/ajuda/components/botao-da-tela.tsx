"use client";

import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ajudaDaTela } from "@/features/ajuda/domain/topico";
import { TOPICOS } from "@/features/ajuda/domain/topicos";

/**
 * O atalho da tela para o assunto dela.
 *
 * Mora na moldura, e **não em cada página**, por um motivo prático: tela
 * nova não pode esquecer de ter ajuda. Vinte páginas com um botão copiado
 * viram vinte e uma no mês que vem, e a vigésima primeira sai sem.
 *
 * Fica **fixo no canto inferior direito**. O topo de cada tela já tem o
 * título e, em várias, um botão de exportar ou de relatório — um "?" ali
 * disputaria espaço com o trabalho. Embaixo ele está sempre no mesmo
 * lugar, que é o que faz alguém aprender onde procurar.
 *
 * **Nunca some.** Sem assunto para a rota, leva ao índice: botão que
 * aparece em algumas telas e não em outras é botão que ninguém procura.
 */
export function BotaoDeAjudaDaTela() {
  const rota = usePathname();

  // Na própria Ajuda ele apontaria para si mesmo.
  if (rota.startsWith("/gestao/ajuda")) return null;

  const topico = ajudaDaTela(TOPICOS, rota);
  const destino = topico ? `/gestao/ajuda/${topico.id}` : "/gestao/ajuda";

  return (
    <Link
      href={destino}
      data-impressao="ocultar"
      aria-label={topico ? `Ajuda: ${topico.titulo}` : "Ajuda"}
      title={topico ? `Ajuda: ${topico.titulo}` : "Abrir a ajuda"}
      className={
        "border-line bg-surface text-ink-muted hover:border-brand-600 hover:text-brand-600 " +
        "focus-visible:outline-brand-600 fixed right-4 bottom-4 z-20 flex items-center gap-2 " +
        "rounded-full border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-2"
      }
    >
      <CircleHelp className="size-5" aria-hidden />
      {/*
        O rótulo aparece só em tela larga. No celular o círculo sozinho
        ocupa menos e já é reconhecível; escrito, cobriria conteúdo.
      */}
      <span className="hidden sm:inline">Ajuda desta tela</span>
    </Link>
  );
}
