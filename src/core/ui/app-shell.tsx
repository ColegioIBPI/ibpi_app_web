import Image from "next/image";
import Link from "next/link";

import { navegacaoDisponivelPara } from "@/core/auth/navegacao";
import { rotaInicial, rotuloDoPerfil } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { BotaoSair } from "@/features/auth/components/botao-sair";

interface AppShellProps {
  sessao: SessionUser;
  children: React.ReactNode;
}

/** Moldura das áreas autenticadas: cabeçalho, menu por perfil e conteúdo. */
export function AppShell({ sessao, children }: AppShellProps) {
  const itens = navegacaoDisponivelPara(sessao.role);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-line bg-surface border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
          <Link href={rotaInicial(sessao.role)} className="shrink-0">
            <Image
              src="/brand/logo-ibpi.png"
              alt="Portal IBPI"
              width={128}
              height={58}
              priority
              className="h-8 w-auto"
            />
          </Link>

          {itens.length > 0 && (
            <nav aria-label="Menu principal" className="flex gap-1">
              {itens.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-ink-muted hover:bg-surface-subtle hover:text-ink rounded-md px-3 py-1.5 text-sm"
                >
                  {item.rotulo}
                </Link>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-ink text-sm font-medium">
                {sessao.nome || sessao.email}
              </p>
              <p className="text-ink-muted text-xs">
                {rotuloDoPerfil(sessao.role)}
              </p>
            </div>
            <BotaoSair />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
