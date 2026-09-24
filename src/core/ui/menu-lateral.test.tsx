import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ehRotaAtual, MenuLateral } from "@/core/ui/menu-lateral";

const pathname = vi.fn(() => "/gestao/alunos");

vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const ITENS = [
  { href: "/gestao/alunos", rotulo: "Alunos" },
  { href: "/gestao/notas", rotulo: "Notas" },
  { href: "/gestao/boletins", rotulo: "Boletins" },
];

function montar(itens = ITENS) {
  return render(
    <MenuLateral
      itens={itens}
      inicio="/gestao"
      nome="Maria da Secretaria"
      perfil="Secretaria"
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  pathname.mockReturnValue("/gestao/alunos");
});

describe("MenuLateral", () => {
  it("lista os itens do perfil, cada um com ícone", () => {
    montar();

    const menu = screen.getByRole("navigation", { name: "Menu principal" });

    for (const item of ITENS) {
      const link = within(menu).getByRole("link", { name: item.rotulo });
      expect(link).toHaveAttribute("href", item.href);
      // O ícone é decorativo: quem usa leitor de tela ouve só o rótulo.
      expect(link.querySelector("svg")).toBeTruthy();
    }
  });

  it("marca a página atual", () => {
    montar();

    const menu = screen.getByRole("navigation", { name: "Menu principal" });

    expect(within(menu).getByRole("link", { name: "Alunos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(menu).getByRole("link", { name: "Notas" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("mostra quem está logado e o perfil", () => {
    montar();

    expect(screen.getByText("Maria da Secretaria")).toBeVisible();
    expect(screen.getByText("Secretaria")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sair" })).toBeVisible();
  });

  it("abre e fecha a gaveta no celular", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    // Com a gaveta aberta há o fundo escuro e o botão de fechar do painel.
    expect(
      screen.getAllByRole("button", { name: "Fechar menu" }).length,
    ).toBeGreaterThan(1);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Fechar menu" })[0],
    );

    expect(
      screen.getAllByRole("button", { name: "Fechar menu" }),
    ).toHaveLength(1);
  });

  it("escolher um item fecha a gaveta", async () => {
    // Sem isso o menu fica por cima do conteúdo que a pessoa acabou de pedir.
    montar();

    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    await userEvent.click(screen.getByRole("link", { name: "Notas" }));

    expect(
      screen.getAllByRole("button", { name: "Fechar menu" }),
    ).toHaveLength(1);
  });

  it("não desenha a navegação quando o perfil não tem item nenhum", () => {
    montar([]);

    expect(
      screen.queryByRole("navigation", { name: "Menu principal" }),
    ).not.toBeInTheDocument();
    // Mas o rodapé com identificação e saída continua.
    expect(screen.getByRole("button", { name: "Sair" })).toBeVisible();
  });

  it("o menu sai da impressão", () => {
    const { container } = montar();

    expect(container.querySelector("aside")).toHaveAttribute(
      "data-impressao",
      "ocultar",
    );
  });
});

describe("ehRotaAtual", () => {
  it("marca a rota exata", () => {
    expect(ehRotaAtual("/gestao/alunos", "/gestao/alunos")).toBe(true);
  });

  it("continua marcada nas telas de dentro", () => {
    // Perder a marcação ao abrir a ficha faria o menu parecer que a pessoa
    // saiu da seção.
    expect(ehRotaAtual("/gestao/alunos/26007/editar", "/gestao/alunos")).toBe(
      true,
    );
  });

  it("não confunde rotas com prefixo em comum", () => {
    expect(ehRotaAtual("/gestao/alunos", "/gestao/aluno")).toBe(false);
    expect(ehRotaAtual("/portal/boletim", "/gestao/boletins")).toBe(false);
  });
});
