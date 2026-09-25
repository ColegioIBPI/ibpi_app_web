import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Extrato } from "@/features/financeiro/components/extrato";
import type { CobrancaComId } from "@/features/financeiro/services/financeiro.server";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const confirmarPagamento = vi.fn();
const criarCobranca = vi.fn();
const darBaixa = vi.fn();
const desfazerBaixa = vi.fn();
const editarCobranca = vi.fn();
const removerCobranca = vi.fn();

vi.mock("@/features/financeiro/actions/financeiro", () => ({
  confirmarPagamento: (id: string, confirmado: boolean) =>
    confirmarPagamento(id, confirmado),
  criarCobranca: (dados: unknown) => criarCobranca(dados),
  darBaixa: (dados: unknown) => darBaixa(dados),
  desfazerBaixa: (id: string) => desfazerBaixa(id),
  editarCobranca: (dados: unknown) => editarCobranca(dados),
  removerCobranca: (id: string) => removerCobranca(id),
}));

const parcela = (
  id: string,
  vencimento: string,
  situacaoAtual: CobrancaComId["situacaoAtual"],
  extra: Partial<CobrancaComId> = {},
): CobrancaComId =>
  ({
    id,
    matricula: "26007",
    vencimento,
    tipo: "mensalidade",
    parcela: 1,
    totalDeParcelas: 12,
    valor: 1000,
    valorPago: extra.valorPago ?? 0,
    dataPagamento: extra.dataPagamento ?? null,
    formaDePagamento: extra.formaDePagamento ?? null,
    confirmado: extra.confirmado,
    banco: extra.banco ?? null,
    recibo: extra.recibo ?? null,
    observacoes: extra.observacoes ?? null,
    origem: "portal",
    situacaoAtual,
  }) as CobrancaComId;

const AÇÕES = [
  confirmarPagamento,
  criarCobranca,
  darBaixa,
  desfazerBaixa,
  editarCobranca,
  removerCobranca,
];

beforeEach(() => {
  vi.clearAllMocks();
  for (const acao of AÇÕES) acao.mockResolvedValue({ ok: true });
});

// A data aparece duas vezes na linha paga (vencimento e pagamento): a
// primeira é sempre a coluna de vencimento.
const linhaDe = (texto: string) => screen.getAllByText(texto)[0].closest("tr")!;

const montar = (cobrancas: CobrancaComId[], podeLancar = true) =>
  render(
    <Extrato matricula="26007" cobrancas={cobrancas} podeLancar={podeLancar} />,
  );

describe("Extrato", () => {
  it("mostra a situação que veio calculada do servidor", () => {
    montar([
      parcela("a", "2026-03-05", "paga", {
        dataPagamento: "2026-03-05",
        valorPago: 1000,
      }),
      parcela("b", "2026-08-05", "vencida"),
      parcela("c", "2026-12-05", "aberta"),
    ]);

    expect(within(linhaDe("05/03/2026")).getByText("Paga")).toBeVisible();
    expect(within(linhaDe("05/08/2026")).getByText("Vencida")).toBeVisible();
    expect(within(linhaDe("05/12/2026")).getByText("Em aberto")).toBeVisible();
  });

  it("mostra o que está sendo cobrado, e não só o valor", () => {
    montar([parcela("a", "2026-03-05", "aberta", { recibo: "00042981" })]);

    const linha = linhaDe("05/03/2026");
    expect(within(linha).getByText("Mensalidade")).toBeVisible();
    expect(within(linha).getByText("1/12")).toBeVisible();
    expect(within(linha).getByText("00042981")).toBeVisible();
  });

  it("aponta o pagamento parcial, que a situação sozinha esconderia", () => {
    montar([
      parcela("a", "2026-03-05", "paga", {
        dataPagamento: "2026-03-05",
        valorPago: 600,
      }),
    ]);

    expect(screen.getByText(/falta R\$\s?400,00/)).toBeVisible();
  });

  it("registra a baixa com forma de pagamento e recibo", async () => {
    montar([parcela("b", "2026-08-05", "vencida")]);

    await userEvent.click(screen.getByRole("button", { name: "Dar baixa" }));
    await userEvent.selectOptions(
      screen.getByLabelText("Tipo de pagamento"),
      "boleto",
    );
    await userEvent.type(screen.getByLabelText("Número do recibo"), "00042981");
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar pagamento" }),
    );

    expect(darBaixa).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "b",
        valorPago: 1000,
        formaDePagamento: "boleto",
        recibo: "00042981",
        confirmado: true,
      }),
    );
  });

  it("a baixa entra confirmada, e desmarcar é deliberado", async () => {
    // Quem lança quase sempre está com o comprovante na mão; o caso raro é
    // a família ter avisado e o extrato ainda não ter chegado.
    montar([parcela("b", "2026-08-05", "vencida")]);

    await userEvent.click(screen.getByRole("button", { name: "Dar baixa" }));
    await userEvent.click(screen.getByLabelText(/Pagamento confirmado/));
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar pagamento" }),
    );

    expect(darBaixa).toHaveBeenCalledWith(
      expect.objectContaining({ confirmado: false }),
    );
  });

  it("a baixa começa com o valor devido preenchido", async () => {
    // Na esmagadora maioria a família paga o que deve; redigitar um número
    // que já está na tela só cria erro.
    montar([parcela("b", "2026-08-05", "vencida")]);

    await userEvent.click(screen.getByRole("button", { name: "Dar baixa" }));

    expect(screen.getByLabelText("Valor pago")).toHaveValue("1000");
  });

  it("a conferência do pagamento é uma caixa na própria linha", async () => {
    montar([
      parcela("a", "2026-03-05", "a-confirmar", {
        dataPagamento: "2026-03-05",
        valorPago: 1000,
        confirmado: false,
      }),
    ]);

    const caixa = screen.getByRole("checkbox", {
      name: /Pagamento confirmado/,
    });
    expect(caixa).not.toBeChecked();

    await userEvent.click(caixa);

    expect(confirmarPagamento).toHaveBeenCalledWith("a", true);
  });

  it("parcela migrada, sem o campo de conferência, conta como confirmada", () => {
    // As 847 parcelas do Access já vieram quitadas: mostrá-las como
    // pendentes inventaria pendências que não existem.
    montar([
      parcela("a", "2026-03-05", "paga", {
        dataPagamento: "2026-03-05",
        valorPago: 1000,
      }),
    ]);

    expect(
      screen.getByRole("checkbox", { name: /Pagamento confirmado/ }),
    ).toBeChecked();
  });

  it("parcela sem pagamento não oferece conferência", () => {
    montar([parcela("b", "2026-08-05", "vencida")]);

    expect(
      screen.queryByRole("checkbox", { name: /Pagamento confirmado/ }),
    ).not.toBeInTheDocument();
  });

  it("cadastra uma parcela avulsa", async () => {
    montar([]);

    await userEvent.click(screen.getByRole("button", { name: /Nova parcela/ }));
    await userEvent.selectOptions(
      screen.getByLabelText("Descrição do pagamento"),
      "taxa-de-material",
    );
    await userEvent.type(screen.getByLabelText("Valor da parcela"), "350,00");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(criarCobranca).toHaveBeenCalledWith(
      expect.objectContaining({
        matricula: "26007",
        tipo: "taxa-de-material",
        valor: 350,
      }),
    );
  });

  it("parcela paga oferece desfazer, não dar baixa nem apagar", () => {
    montar([
      parcela("a", "2026-03-05", "paga", {
        dataPagamento: "2026-03-05",
        valorPago: 1000,
      }),
    ]);

    expect(
      screen.queryByRole("button", { name: "Dar baixa" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Desfazer baixa/ }),
    ).toBeVisible();
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

    montar([parcela("b", "2026-08-05", "vencida")]);

    await userEvent.click(
      screen.getByRole("button", { name: /Apagar parcela/ }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Parcela paga não pode ser apagada.",
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("quem só lê não recebe ação nenhuma", () => {
    montar(
      [parcela("b", "2026-08-05", "vencida", { observacoes: "BP" })],
      false,
    );

    expect(
      screen.queryByRole("button", { name: "Dar baixa" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Editar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Nova parcela/ }),
    ).not.toBeInTheDocument();
    // A observação continua visível: é informação da parcela, não ação.
    expect(screen.getByText("BP")).toBeVisible();
  });

  it("a família não altera a conferência do pagamento", async () => {
    montar(
      [
        parcela("a", "2026-03-05", "paga", {
          dataPagamento: "2026-03-05",
          valorPago: 1000,
        }),
      ],
      false,
    );

    const caixa = screen.getByRole("checkbox", {
      name: /Pagamento confirmado/,
    });
    expect(caixa).toBeDisabled();

    await userEvent.click(caixa);
    expect(confirmarPagamento).not.toHaveBeenCalled();
  });

  it("sem parcela nenhuma, explica o que fazer", () => {
    montar([]);

    expect(screen.getByText("Nenhuma parcela registrada")).toBeVisible();
    expect(screen.getByText(/Cadastre uma parcela/)).toBeVisible();
  });

  it("para quem só lê, o vazio não sugere cadastrar nada", () => {
    montar([], false);

    expect(screen.queryByText(/Cadastre uma parcela/)).not.toBeInTheDocument();
  });
});
