import { navegacaoDisponivelPara } from "@/core/auth/navegacao";
import { areaDoPerfil, rotaInicial, rotuloDoPerfil } from "@/core/auth/roles";
import type { SessionUser } from "@/core/auth/session";
import { MenuLateral } from "@/core/ui/menu-lateral";
import {
  anoLetivoEscolhido,
  anosLetivosDisponiveis,
} from "@/core/escola/ano-letivo.server";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import { BotaoDeAjudaDaTela } from "@/features/ajuda/components/botao-da-tela";
import { SeletorDeAnoLetivo } from "@/features/ano-letivo/components/seletor";

interface AppShellProps {
  sessao: SessionUser;
  children: React.ReactNode;
}

/** Moldura das áreas autenticadas: menu lateral por perfil e conteúdo. */
export async function AppShell({ sessao, children }: AppShellProps) {
  const itens = navegacaoDisponivelPara(sessao.role).map((item) => ({
    href: item.href,
    rotulo: item.rotulo,
  }));

  /**
   * A moldura da equipe tem duas coisas que a da família não tem.
   *
   * O **seletor de ano letivo**, porque é a equipe que circula entre os
   * anos — a família vê o ano em curso do filho dela. E a **Ajuda**, que
   * hoje é escrita para a equipe: oferecê-la ao responsável seria
   * mandá-lo a um texto que não fala com ele.
   */
  const ehGestao = areaDoPerfil(sessao.role) === "gestao";

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <MenuLateral
        itens={itens}
        inicio={rotaInicial(sessao.role)}
        nome={sessao.nome || sessao.email}
        perfil={rotuloDoPerfil(sessao.role)}
        anoLetivo={
          ehGestao ? (
            <SeletorDeAnoLetivo
              escolhido={await anoLetivoEscolhido()}
              anos={await anosLetivosDisponiveis()}
              anoCorrente={anoLetivoAtual()}
            />
          ) : undefined
        }
      />

      {/*
        A folga no rodapé é por causa do botão de ajuda, que flutua no
        canto. Sem ela, a última linha de uma tabela longa ficaria
        permanentemente coberta — e é justamente no fim da lista que
        alguém marca a última caixa.
      */}
      <main
        className={`mx-auto w-full max-w-6xl flex-1 px-4 pt-6 ${
          ehGestao ? "pb-24" : "pb-6"
        }`}
      >
        {children}
      </main>

      {ehGestao && <BotaoDeAjudaDaTela />}
    </div>
  );
}
