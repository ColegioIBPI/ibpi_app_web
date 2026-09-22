import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SelectField, TextField } from "@/core/ui/field";

describe("TextField", () => {
  it("associa o rótulo ao campo", () => {
    render(<TextField label="Nome do aluno" />);

    expect(screen.getByLabelText("Nome do aluno")).toBeInTheDocument();
  });

  it("anuncia o erro e marca o campo como inválido", () => {
    render(<TextField label="CPF" error="CPF inválido" />);

    const input = screen.getByLabelText("CPF");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("CPF inválido");
    expect(input).toHaveAccessibleDescription("CPF inválido");
  });

  it("mostra a dica quando não há erro", () => {
    render(<TextField label="Matrícula" hint="Somente números" />);

    expect(screen.getByLabelText("Matrícula")).toHaveAccessibleDescription(
      "Somente números",
    );
  });

  it("esconde a dica quando há erro, para não competir com a mensagem", () => {
    render(
      <TextField
        label="Matrícula"
        hint="Somente números"
        error="Obrigatório"
      />,
    );

    expect(screen.queryByText("Somente números")).not.toBeInTheDocument();
  });
});

describe("SelectField", () => {
  it("renderiza as opções e associa o rótulo", () => {
    render(
      <SelectField label="Turma" defaultValue="EM1A">
        <option value="EM1A">EM1A</option>
        <option value="EM2A">EM2A</option>
      </SelectField>,
    );

    expect(screen.getByLabelText("Turma")).toHaveValue("EM1A");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });
});
