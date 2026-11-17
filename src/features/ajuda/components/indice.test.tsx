import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { IndiceDaAjuda } from "@/features/ajuda/components/indice";
import type { Topico } from "@/features/ajuda/domain/topico";

const TOPICOS: Topico[] = [
  {
    id: "liberacao-do-boletim",
    titulo: "A família só vê o boletim depois que você libera",
    resumo: "Três caixas por aluno, uma por trimestre.",
    perfis: ["secretaria", "professor"],
    blocos: [{ tipo: "paragrafo", texto: "Recolher volta a esconder." }],
  },
  {
    id: "recibos",
    titulo: "Recibos",
    resumo: "Não se edita.",
    perfis: ["secretaria", "financeiro"],
    blocos: [{ tipo: "paragrafo", texto: "Cancele com motivo." }],
  },
  {
    id: "carteirinha",
    titulo: "Carteirinha",
    resumo: "Monta-se sozinha do cadastro.",
    perfis: "todos",
    blocos: [{ tipo: "paragrafo", texto: "Vence em 31 de dezembro." }],
  },
];

const digitando = () => userEvent.setup({ delay: null });

describe("filtro por função", () => {
  it("nasce ligado — mostra só o que é da função de quem abriu", () => {
    render(<IndiceDaAjuda topicos={TOPICOS} role="professor" />);

    expect(screen.getByText("Três caixas por aluno, uma por trimestre.")).toBeInTheDocument();
    expect(screen.getByText("Monta-se sozinha do cadastro.")).toBeInTheDocument();
    expect(screen.queryByText("Não se edita.")).not.toBeInTheDocument();
  });

  it("desligar mostra o sistema inteiro", () => {
    // Esconder não é o objetivo: quem quer entender o sistema todo tem
    // direito, e o que é segredo não está na ajuda.
    const usuario = digitando();

    return (async () => {
      render(<IndiceDaAjuda topicos={TOPICOS} role="professor" />);

      await usuario.click(
        screen.getByRole("checkbox", { name: /Só o que é da minha função/ }),
      );

      expect(screen.getByText("Não se edita.")).toBeInTheDocument();
    })();
  });

  it("conta quantos ficaram de fora do filtro", () => {
    render(<IndiceDaAjuda topicos={TOPICOS} role="professor" />);
    expect(
      screen.getByText(/1 de outras funções, fora do filtro/),
    ).toBeInTheDocument();
  });

  it("a conta é do filtro de função, não da busca", async () => {
    // Pego na tela real: a secretaria alcança tudo, buscou "falta", achou
    // sete e leu "14 fora do filtro" — nenhum estava fora da função dela.
    const usuario = digitando();
    render(<IndiceDaAjuda topicos={TOPICOS} role="secretaria" />);

    await usuario.type(screen.getByLabelText("Buscar na ajuda"), "recibo");

    expect(screen.getByText(/^1 assunto$/)).toBeInTheDocument();
    expect(screen.queryByText(/fora do filtro/)).not.toBeInTheDocument();
  });
});

describe("busca", () => {
  it("filtra enquanto a pessoa digita", async () => {
    const usuario = digitando();
    render(<IndiceDaAjuda topicos={TOPICOS} role="secretaria" />);

    await usuario.type(screen.getByLabelText("Buscar na ajuda"), "recibo");

    expect(screen.getByText("Não se edita.")).toBeInTheDocument();
    expect(
      screen.queryByText("Três caixas por aluno, uma por trimestre."),
    ).not.toBeInTheDocument();
  });

  it("acha pelo corpo, não só pelo título", async () => {
    const usuario = digitando();
    render(<IndiceDaAjuda topicos={TOPICOS} role="secretaria" />);

    await usuario.type(screen.getByLabelText("Buscar na ajuda"), "recolher");

    expect(
      screen.getByText("Três caixas por aluno, uma por trimestre."),
    ).toBeInTheDocument();
  });

  it("sem resultado, oferece procurar fora da própria função", async () => {
    // O caminho do engano mais provável: a resposta existe, mas é de
    // outra função, e o filtro a escondeu sem dizer.
    const usuario = digitando();
    render(<IndiceDaAjuda topicos={TOPICOS} role="professor" />);

    await usuario.type(screen.getByLabelText("Buscar na ajuda"), "recibo");

    const atalho = screen.getByRole("button", {
      name: /procurar em todos os assuntos/,
    });

    await usuario.click(atalho);

    expect(screen.getByText("Não se edita.")).toBeInTheDocument();
  });
});

describe("os cartões", () => {
  it("cada assunto tem endereço próprio, para mandar a um colega", () => {
    render(<IndiceDaAjuda topicos={TOPICOS} role="secretaria" />);

    expect(
      screen.getByRole("link", { name: /Recibos/ }),
    ).toHaveAttribute("href", "/gestao/ajuda/recibos");
  });
});
