import { navegacaoDisponivelPara } from "@/core/auth/navegacao";
import { areaDoPerfil, rotaInicial, rotuloDoPerfil } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { MenuLateral } from "@/core/ui/menu-lateral";
import { BotaoDeAjudaDaTela } from "@/features/ajuda/components/botao-da-tela";

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

  /**
   * Só na gestão: a Ajuda de hoje é escrita para a equipe. A da família
   * é outro conteúdo, e oferecê-la antes de existir seria mandar o
   * responsável para um texto que não fala com ele.
   */
  const comAjuda = areaDoPerfil(sessao.role) === "gestao";

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <MenuLateral
        itens={itens}
        inicio={rotaInicial(sessao.role)}
        nome={sessao.nome || sessao.email}
        perfil={rotuloDoPerfil(sessao.role)}
      />

      {/*
        A folga no rodapé é por causa do botão de ajuda, que flutua no
        canto. Sem ela, a última linha de uma tabela longa ficaria
        permanentemente coberta — e é justamente no fim da lista que
        alguém marca a última caixa.
      */}
      <main
        className={`mx-auto w-full max-w-6xl flex-1 px-4 pt-6 ${
          comAjuda ? "pb-24" : "pb-6"
        }`}
      >
        {children}
      </main>

      {comAjuda && <BotaoDeAjudaDaTela />}
    </div>
  );
}
