import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GradeDeNotas } from "@/features/notas/components/grade-de-notas";
import type { LinhaDeLancamento } from "@/features/notas/domain/lancamento";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const lancarNotas = vi.fn();

vi.mock("@/features/notas/actions/notas", () => ({
  lancarNotas: (dados: unknown) => lancarNotas(dados),
}));

const linha = (
  matricula: string,
  nome: string,
  projeto = "",
  tarefas = "",
  av = "",
  faltas = 0,
  jaLancado = false,
): LinhaDeLancamento => ({
  matricula,
  nome,
  avaliacoes: { projeto, tarefas, av },
  faltas,
  jaLancado,
});

function montar(
  linhas: LinhaDeLancamento[],
  faltasDoDiario: Record<string, number> = {},
) {
  return render(
    <GradeDeNotas
      alocacaoId="2026-prof1-EM2A-fisica"
      trimestre={2}
      linhas={linhas}
      faltasDoDiario={faltasDoDiario}
    />,
  );
}

const linhaDe = (nome: string) => screen.getByText(nome).closest("tr")!;

beforeEach(() => {
  vi.clearAllMocks();
  lancarNotas.mockResolvedValue({ ok: true, gravados: 1 });
});

describe("GradeDeNotas", () => {
  it("mostra a média enquanto o professor digita", async () => {
    // Descobrir só depois de salvar que uma nota saiu trocada custa uma ida
    // e volta a cada erro de digitação.
    montar([linha("26007", "Bruno Lima")]);

    await userEvent.type(screen.getByLabelText("Projeto de Bruno Lima"), "6");
    await userEvent.type(screen.getByLabelText("Tarefas de Bruno Lima"), "7");

    // Ainda falta a AV: a média não aparece, para não mostrar um número que
    // não significa nada.
    expect(within(linhaDe("Bruno Lima")).getByText("—")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("AV de Bruno Lima"), "8");

    expect(within(linhaDe("Bruno Lima")).getByText("7,0")).toBeInTheDocument();
  });

  it("aceita vírgula decimal", async () => {
    montar([linha("26007", "Bruno Lima")]);

    await userEvent.type(screen.getByLabelText("Projeto de Bruno Lima"), "7,5");
    await userEvent.type(screen.getByLabelText("Tarefas de Bruno Lima"), "7,5");
    await userEvent.type(screen.getByLabelText("AV de Bruno Lima"), "7,5");

    expect(within(linhaDe("Bruno Lima")).getByText("7,5")).toBeInTheDocument();
  });

  it("envia só quem mudou", async () => {
    montar([
      linha("25047", "Ana Souza", "7", "7", "7", 0, true),
      linha("26007", "Bruno Lima", "8", "8", "8", 0, true),
    ]);

    await userEvent.clear(screen.getByLabelText("Projeto de Bruno Lima"));
    await userEvent.type(screen.getByLabelText("Projeto de Bruno Lima"), "9");
    await userEvent.click(screen.getByRole("button", { name: "Salvar notas" }));

    expect(lancarNotas).toHaveBeenCalledWith({
      alocacaoId: "2026-prof1-EM2A-fisica",
      trimestre: 2,
      linhas: [
        {
          matricula: "26007",
          avaliacoes: { projeto: 9, tarefas: 8, av: 8 },
          faltas: 0,
        },
      ],
    });
  });

  it("não salva quando nada mudou", async () => {
    montar([linha("26007", "Bruno Lima", "7", "7", "7", 0, true)]);

    await userEvent.click(screen.getByRole("button", { name: "Salvar notas" }));

    expect(lancarNotas).not.toHaveBeenCalled();
    expect(screen.getByText("Nada mudou desde o último salvamento.")).toBeVisible();
  });

  it("aponta a linha com nota inválida e não envia nada", async () => {
    montar([
      linha("25047", "Ana Souza"),
      linha("26007", "Bruno Lima"),
    ]);

    await userEvent.type(screen.getByLabelText("Projeto de Ana Souza"), "8");
    await userEvent.type(screen.getByLabelText("Projeto de Bruno Lima"), "11");
    await userEvent.click(screen.getByRole("button", { name: "Salvar notas" }));

    expect(lancarNotas).not.toHaveBeenCalled();
    expect(within(linhaDe("Bruno Lima")).getByRole("alert")).toHaveTextContent(
      "0 a 10",
    );
    expect(
      within(linhaDe("Ana Souza")).queryByRole("alert"),
    ).not.toBeInTheDocument();
  });

  it("mostra a contagem do diário quando ela diverge do que está na tela", () => {
    montar([linha("26007", "Bruno Lima", "", "", "", 2)], { "26007": 5 });

    expect(within(linhaDe("Bruno Lima")).getByText("diário: 5")).toBeVisible();
  });

  it("não repete a contagem do diário quando ela já bate", () => {
    montar([linha("26007", "Bruno Lima", "", "", "", 5)], { "26007": 5 });

    expect(
      within(linhaDe("Bruno Lima")).queryByText(/diário:/),
    ).not.toBeInTheDocument();
  });

  it("mostra o erro devolvido pela ação", async () => {
    lancarNotas.mockResolvedValue({
      ok: false,
      erro: "Alocação não encontrada.",
    });

    montar([linha("26007", "Bruno Lima")]);

    await userEvent.type(screen.getByLabelText("Projeto de Bruno Lima"), "7");
    await userEvent.click(screen.getByRole("button", { name: "Salvar notas" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Alocação não encontrada.",
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("conta as alterações pendentes", async () => {
    montar([linha("26007", "Bruno Lima", "7", "7", "7", 0, true)]);

    expect(screen.getByText("Nada alterado.")).toBeVisible();

    await userEvent.clear(screen.getByLabelText("AV de Bruno Lima"));
    await userEvent.type(screen.getByLabelText("AV de Bruno Lima"), "9");

    expect(
      screen.getByText("1 aluno com alteração pendente."),
    ).toBeVisible();
  });
});
