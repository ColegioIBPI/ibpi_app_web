import { navegacaoDisponivelPara } from "@/core/auth/navegacao";
import { rotaInicial, rotuloDoPerfil } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { MenuLateral } from "@/core/ui/menu-lateral";

interface AppShellProps {
  sessao: SessionUser;
  children: React.ReactNode;
}

/** Moldura das áreas autenticadas: menu lateral por perfil e conteúdo. */
export function AppShell({ sessao, children }: AppShellProps) {
  const itens = navegacaoDisponivelPara(sessao.role).map((item) => ({
    href: item.href,
    rotulo: item.rotulo,
  }));

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <MenuLateral
        itens={itens}
        inicio={rotaInicial(sessao.role)}
        nome={sessao.nome || sessao.email}
        perfil={rotuloDoPerfil(sessao.role)}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
