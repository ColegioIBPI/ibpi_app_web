import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormularioDeRecibo } from "@/features/recibos/components/formulario";

const emitir = vi.hoisted(() => vi.fn());
const listarParcelas = vi.hoisted(() => vi.fn(async () => []));

vi.mock("@/features/recibos/actions/recibos", () => ({
  emitirRecibo: emitir,
  listarParcelasEmAberto: listarParcelas,
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

  it("lança a parcela em aberto como item ligado", async () => {
    // Emitir o recibo dá baixa na parcela: a secretaria recebe mensalidade
    // no balcão e não deveria lançar o pagamento duas vezes.
    listarParcelas.mockResolvedValueOnce([
      {
        id: "c-5",
        vencimento: "2026-03-10",
        descricao: "Mensalidade",
        referencia: "Parcela 5/12",
        servico: "mensalidade",
        valor: 1923,
      },
    ] as never);

    const usuario = userEvent.setup();
    montar();

    await usuario.selectOptions(screen.getByLabelText("Aluno"), "26031");

    await usuario.click(
      await screen.findByRole("button", { name: /lançar no recibo/i }),
    );

    // A linha em branco inicial sai de cena: o recibo não pode sair com um
    // item vazio que ninguém pediu.
    expect(screen.getAllByLabelText("Valor")).toHaveLength(1);
    expect(screen.getByLabelText("Valor")).toHaveValue("1923");
    expect(screen.getByText(/quita a parcela de 10\/03\/2026/)).toBeInTheDocument();
    expect(screen.getByText("R$ 1.923,00")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Emitir recibo" }));

    expect(emitir).toHaveBeenCalledWith(
      expect.objectContaining({
        itens: [expect.objectContaining({ cobrancaId: "c-5", valor: 1923 })],
      }),
    );
  });

  it("desligar o item da parcela não apaga o item", async () => {
    // Emitir sem dar baixa é caso real: a família paga adiantado e a
    // parcela certa ainda não existe no carnê.
    listarParcelas.mockResolvedValueOnce([
      {
        id: "c-5",
        vencimento: "2026-03-10",
        descricao: "Mensalidade",
        referencia: "Parcela 5/12",
        servico: "mensalidade",
        valor: 1923,
      },
    ] as never);

    const usuario = userEvent.setup();
    montar();

    await usuario.selectOptions(screen.getByLabelText("Aluno"), "26031");
    await usuario.click(
      await screen.findByRole("button", { name: /lançar no recibo/i }),
    );
    await usuario.click(
      screen.getByRole("button", { name: /desligar o item 1 da parcela/i }),
    );

    expect(screen.getByLabelText("Valor")).toHaveValue("1923");
    expect(screen.queryByText(/quita a parcela/)).not.toBeInTheDocument();
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
