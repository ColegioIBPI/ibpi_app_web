import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BotaoDeAjudaDaTela } from "@/features/ajuda/components/botao-da-tela";

const rota = vi.hoisted(() => ({ atual: "/gestao" }));

vi.mock("next/navigation", () => ({
  usePathname: () => rota.atual,
}));

beforeEach(() => {
  rota.atual = "/gestao";
});

const botao = () => screen.queryByRole("link", { name: /Ajuda/ });

describe("ajuda da tela", () => {
  it("leva ao assunto da tela aberta", () => {
    rota.atual = "/gestao/boletins";
    render(<BotaoDeAjudaDaTela />);

    expect(botao()).toHaveAttribute(
      "href",
      "/gestao/ajuda/liberacao-do-boletim",
    );
  });

  it("vale para as telas abaixo — a ficha é a tela de alunos", () => {
    rota.atual = "/gestao/alunos/26007";
    render(<BotaoDeAjudaDaTela />);

    expect(botao()).toHaveAttribute(
      "href",
      "/gestao/ajuda/situacao-da-matricula",
    );
  });

  it("a rota mais específica ganha", () => {
    rota.atual = "/gestao/configuracoes/vinculos";
    render(<BotaoDeAjudaDaTela />);

    expect(botao()).toHaveAttribute("href", "/gestao/ajuda/trocar-professor");
  });

  it("diz no rótulo qual é o assunto", () => {
    // Quem usa leitor de tela precisa saber para onde vai antes de ir; e
    // o `title` responde o mesmo a quem passa o mouse.
    rota.atual = "/gestao/recibos";
    render(<BotaoDeAjudaDaTela />);

    expect(screen.getByRole("link", { name: "Ajuda: Recibos" })).toHaveAttribute(
      "title",
      "Ajuda: Recibos",
    );
  });

  it("sem assunto para a rota, leva ao índice — nunca some", () => {
    // Botão que aparece em algumas telas e não em outras é botão que
    // ninguém procura.
    rota.atual = "/gestao/uma-tela-nova-sem-ajuda";
    render(<BotaoDeAjudaDaTela />);

    expect(botao()).toHaveAttribute("href", "/gestao/ajuda");
  });

  it("não aparece dentro da própria Ajuda", () => {
    rota.atual = "/gestao/ajuda/recibos";
    render(<BotaoDeAjudaDaTela />);

    expect(botao()).not.toBeInTheDocument();
  });

  it("sai da impressão", () => {
    rota.atual = "/gestao/boletins";
    render(<BotaoDeAjudaDaTela />);

    expect(botao()).toHaveAttribute("data-impressao", "ocultar");
  });
});
