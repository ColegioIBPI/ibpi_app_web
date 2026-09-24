import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Extrato } from "@/features/financeiro/components/extrato";
import type { CobrancaComId } from "@/features/financeiro/services/financeiro.server";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const darBaixa = vi.fn();
const desfazerBaixa = vi.fn();
const editarCobranca = vi.fn();
const removerCobranca = vi.fn();

vi.mock("@/features/financeiro/actions/financeiro", () => ({
  darBaixa: (dados: unknown) => darBaixa(dados),
  desfazerBaixa: (id: string) => desfazerBaixa(id),
  editarCobranca: (dados: unknown) => editarCobranca(dados),
  removerCobranca: (id: string) => removerCobranca(id),
}));

const parcela = (
  id: string,
  vencimento: string,
  situacaoAtual: "aberta" | "paga" | "vencida",
  extra: Partial<CobrancaComId> = {},
): CobrancaComId =>
  ({
    id,
    matricula: "26007",
    vencimento,
    parcela: 1,
    totalDeParcelas: 12,
    valor: 1000,
    valorPago: extra.valorPago ?? 0,
    dataPagamento: extra.dataPagamento ?? null,
    banco: extra.banco ?? null,
    recibo: null,
    observacoes: extra.observacoes ?? null,
    origem: "portal",
    situacaoAtual,
  }) as CobrancaComId;

beforeEach(() => {
  vi.clearAllMocks();
  for (const acao of [darBaixa, desfazerBaixa, editarCobranca, removerCobranca]) {
    acao.mockResolvedValue({ ok: true });
  }
});

// A data aparece duas vezes na linha paga (vencimento e pagamento): a
// primeira é sempre a coluna de vencimento.
const linhaDe = (texto: string) =>
  screen.getAllByText(texto)[0].closest("tr")!;

describe("Extrato", () => {
  it("mostra a situação que veio calculada do servidor", () => {
    render(
      <Extrato
        cobrancas={[
          parcela("a", "2026-03-05", "paga", {
            dataPagamento: "2026-03-05",
            valorPago: 1000,
          }),
          parcela("b", "2026-08-05", "vencida"),
          parcela("c", "2026-12-05", "aberta"),
        ]}
        podeLancar
      />,
    );

    expect(within(linhaDe("05/03/2026")).getByText("Paga")).toBeVisible();
    expect(within(linhaDe("05/08/2026")).getByText("Vencida")).toBeVisible();
    expect(within(linhaDe("05/12/2026")).getByText("Em aberto")).toBeVisible();
  });

  it("aponta o pagamento parcial, que a situação sozinha esconderia", () => {
    render(
      <Extrato
        cobrancas={[
          parcela("a", "2026-03-05", "paga", {
            dataPagamento: "2026-03-05",
            valorPago: 600,
          }),
        ]}
        podeLancar
      />,
    );

    expect(screen.getByText(/falta R\$\s?400,00/)).toBeVisible();
  });

  it("registra a baixa com banco e recibo", async () => {
    render(
      <Extrato cobrancas={[parcela("b", "2026-08-05", "vencida")]} podeLancar />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Dar baixa" }));
    await userEvent.type(screen.getByLabelText("Banco"), "ITAÚ");
    await userEvent.type(screen.getByLabelText("Recibo"), "00042981");
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar pagamento" }),
    );

    expect(darBaixa).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "b",
        valorPago: 1000,
        banco: "ITAÚ",
        recibo: "00042981",
      }),
    );
  });

  it("a baixa começa com o valor devido preenchido", async () => {
    // Na esmagadora maioria a família paga o que deve; redigitar um número
    // que já está na tela só cria erro.
    render(
      <Extrato cobrancas={[parcela("b", "2026-08-05", "vencida")]} podeLancar />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Dar baixa" }));

    expect(screen.getByLabelText("Valor pago")).toHaveValue("1000");
  });

  it("parcela paga oferece desfazer, não dar baixa nem apagar", () => {
    render(
      <Extrato
        cobrancas={[
          parcela("a", "2026-03-05", "paga", {
            dataPagamento: "2026-03-05",
            valorPago: 1000,
          }),
        ]}
        podeLancar
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Dar baixa" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Desfazer baixa/ })).toBeVisible();
    // Apagar uma parcela quitada sumiria com o registro de um pagamento.
    expect(
      screen.queryByRole("button", { name: /Apagar parcela/ }),
    ).not.toBeInTheDocument();
  });

  it("mostra o erro devolvido pela ação", async () => {
    removerCobranca.mockResolvedValue({
      ok: false,
      erro: "Parcela paga não pode ser apagada.",
    });

    render(
      <Extrato cobrancas={[parcela("b", "2026-08-05", "vencida")]} podeLancar />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Apagar parcela/ }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Parcela paga não pode ser apagada.",
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("quem só lê não recebe ação nenhuma", () => {
    render(
      <Extrato
        cobrancas={[parcela("b", "2026-08-05", "vencida", { observacoes: "BP" })]}
        podeLancar={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Dar baixa" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Editar" }),
    ).not.toBeInTheDocument();
    // No lugar das ações, a observação da parcela.
    expect(screen.getByText("BP")).toBeVisible();
  });

  it("sem parcela nenhuma, explica o que fazer", () => {
    render(<Extrato cobrancas={[]} podeLancar />);

    expect(screen.getByText("Nenhuma parcela registrada")).toBeVisible();
    expect(screen.getByText(/Gere um carnê/)).toBeVisible();
  });

  it("para quem só lê, o vazio não sugere gerar carnê", () => {
    render(<Extrato cobrancas={[]} podeLancar={false} />);

    expect(screen.queryByText(/Gere um carnê/)).not.toBeInTheDocument();
  });
});
