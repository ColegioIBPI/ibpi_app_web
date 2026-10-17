import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormularioDeRecibo } from "@/features/recibos/components/formulario";

const emitir = vi.hoisted(() => vi.fn());

vi.mock("@/features/recibos/actions/recibos", () => ({
  emitirRecibo: emitir,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function montar(series = [{ serie: "A", descricao: null, proximoNumero: 848 }]) {
  return render(
    <FormularioDeRecibo
      alunos={[{ matricula: "26031", nome: "Alice Vianna" }]}
      series={series}
    />,
  );
}

describe("formulário de recibo", () => {
  it("soma os itens enquanto a pessoa digita", async () => {
    // O total na tela é a conferência antes de emitir: depois de emitido,
    // o recibo não se edita.
    const usuario = userEvent.setup();
    montar();

    await usuario.type(screen.getByLabelText("Valor"), "1.923,00");
    expect(screen.getByText("R$ 1.923,00")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /adicionar item/i }));

    const valores = screen.getAllByLabelText("Valor");
    await usuario.type(valores[1], "77,50");

    expect(screen.getByText("R$ 2.000,50")).toBeInTheDocument();
  });

  it("não emite sem aluno", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.type(screen.getByLabelText("Valor"), "100");
    await usuario.click(screen.getByRole("button", { name: "Emitir recibo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Escolha o aluno",
    );
    expect(emitir).not.toHaveBeenCalled();
  });

  it("não emite item com valor zerado", async () => {
    // Um recibo com item de R$ 0,00 passaria pela impressão e só apareceria
    // na conferência do caixa.
    const usuario = userEvent.setup();
    montar();

    await usuario.selectOptions(screen.getByLabelText("Aluno"), "26031");
    await usuario.click(screen.getByRole("button", { name: "Emitir recibo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "valor maior que zero",
    );
    expect(emitir).not.toHaveBeenCalled();
  });

  it("sem talão aberto, não oferece o formulário", async () => {
    // Sem série não há numeração, e sem numeração não há recibo.
    montar([]);

    expect(screen.getByText(/Nenhuma série de recibos aberta/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Emitir recibo" }),
    ).not.toBeInTheDocument();
  });

  it("remove um item sem embaralhar os outros", async () => {
    // As linhas são identificadas por chave própria, não pelo índice:
    // remover a primeira não pode levar o valor digitado na segunda.
    const usuario = userEvent.setup();
    montar();

    await usuario.type(screen.getByLabelText("Valor"), "10");
    await usuario.click(screen.getByRole("button", { name: /adicionar item/i }));
    await usuario.type(screen.getAllByLabelText("Valor")[1], "25");

    await usuario.click(screen.getByRole("button", { name: "Remover item 1" }));

    const restantes = screen.getAllByLabelText("Valor");
    expect(restantes).toHaveLength(1);
    expect(restantes[0]).toHaveValue("25");
    expect(screen.getByText("R$ 25,00")).toBeInTheDocument();
  });
});
