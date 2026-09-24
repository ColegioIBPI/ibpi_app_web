"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/core/lib/cn";
import { iconeDoMenu } from "@/core/ui/icones-do-menu";
import { BotaoSair } from "@/features/auth/components/botao-sair";

export interface ItemDoMenu {
  href: string;
  rotulo: string;
}

interface MenuLateralProps {
  itens: ItemDoMenu[];
  inicio: string;
  nome: string;
  perfil: string;
}

/**
 * Menu lateral das áreas autenticadas.
 *
 * Na lateral cabem mais itens que na barra de cima, e eles não competem com
 * o nome da pessoa e o botão de sair — o menu já tinha onze entradas e
 * quebrava em duas linhas em telas médias.
 *
 * Em telas pequenas ele vira gaveta: a lateral fixa comeria metade de um
 * celular, e é no celular que a família abre o boletim.
 */
export function MenuLateral({ itens, inicio, nome, perfil }: MenuLateralProps) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {/* Barra de cima: só existe no celular, onde a lateral fica escondida. */}
      <div
        data-impressao="ocultar"
        className="border-line bg-surface sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-2 lg:hidden"
      >
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          aria-expanded={aberto}
          className="text-ink-muted hover:bg-surface-subtle hover:text-ink -ml-2 rounded-md p-2"
        >
          <Menu className="size-5" aria-hidden />
        </button>

        <Link href={inicio}>
          <Image
            src="/brand/logo-ibpi.png"
            alt="Portal IBPI"
            width={128}
            height={58}
            priority
            className="h-7 w-auto"
          />
        </Link>
      </div>

      {aberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        data-impressao="ocultar"
        className={cn(
          "border-line bg-surface flex w-64 shrink-0 flex-col border-r",
          // No celular é gaveta sobreposta; do `lg` para cima é coluna fixa
          // que acompanha a rolagem.
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:transition-transform",
          "lg:sticky lg:top-0 lg:h-dvh",
          aberto ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Link href={inicio}>
            <Image
              src="/brand/logo-ibpi.png"
              alt="Portal IBPI"
              width={128}
              height={58}
              priority
              className="h-8 w-auto"
            />
          </Link>

          <button
            type="button"
            onClick={() => setAberto(false)}
            aria-label="Fechar menu"
            className="text-ink-muted hover:bg-surface-subtle hover:text-ink rounded-md p-1 lg:hidden"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {itens.length > 0 && (
          <nav
            aria-label="Menu principal"
            className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2"
          >
            {itens.map((item) => {
              const Icone = iconeDoMenu(item.href);
              const atual = ehRotaAtual(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={atual ? "page" : undefined}
                  // Escolher um item fecha a gaveta: sem isso o menu fica
                  // por cima do conteúdo que a pessoa acabou de pedir.
                  onClick={() => setAberto(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                    atual
                      ? "bg-brand-50 text-brand-700 font-medium"
                      : "text-ink-muted hover:bg-surface-subtle hover:text-ink",
                  )}
                >
                  <Icone className="size-4 shrink-0" aria-hidden />
                  {item.rotulo}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="border-line flex items-center justify-between gap-2 border-t px-4 py-3">
          <div className="min-w-0">
            <p className="text-ink truncate text-sm font-medium">{nome}</p>
            <p className="text-ink-muted text-xs">{perfil}</p>
          </div>
          <BotaoSair />
        </div>
      </aside>
    </>
  );
}

/**
 * O item fica marcado também nas telas de dentro dele.
 *
 * Quem está em `/gestao/alunos/26007/editar` continua em "Alunos" — perder a
 * marcação ao abrir a ficha faria o menu parecer que a pessoa saiu da seção.
 */
export function ehRotaAtual(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
