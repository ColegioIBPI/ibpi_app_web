import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
} from "@/core/ui/states";

describe("estados de tela", () => {
  it("carregando é anunciado para leitor de tela", () => {
    render(<LoadingState />);

    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
  });

  it("vazio mostra título e descrição", () => {
    render(
      <EmptyState
        title="Nenhum aluno nesta turma"
        description="Matricule um aluno para começar."
      />,
    );

    expect(screen.getByText("Nenhum aluno nesta turma")).toBeInTheDocument();
    expect(
      screen.getByText("Matricule um aluno para começar."),
    ).toBeInTheDocument();
  });

  it("erro tem papel de alerta e permite tentar novamente", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Tentar novamente" }),
    );

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("erro sem retry não mostra o botão", () => {
    render(<ErrorState />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("sem permissão explica o que fazer", () => {
    render(<ForbiddenState />);

    expect(
      screen.getByText("Você não tem acesso a esta área"),
    ).toBeInTheDocument();
  });
});
