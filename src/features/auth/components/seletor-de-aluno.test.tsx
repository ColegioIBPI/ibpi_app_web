import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SeletorDeAluno } from "@/features/auth/components/seletor-de-aluno";

const CHAVE = "ibpi:aluno-selecionado";

beforeEach(() => {
  window.localStorage.clear();
});

describe("SeletorDeAluno", () => {
  it("não aparece quando há um único filho", () => {
    render(<SeletorDeAluno vinculados={["1001"]} />);

    expect(screen.queryByLabelText("Aluno")).not.toBeInTheDocument();
  });

  it("não aparece quando não há filho vinculado", () => {
    render(<SeletorDeAluno vinculados={[]} />);

    expect(screen.queryByLabelText("Aluno")).not.toBeInTheDocument();
  });

  it("lista os filhos e começa no primeiro", () => {
    render(<SeletorDeAluno vinculados={["1001", "1002"]} />);

    expect(screen.getByLabelText("Aluno")).toHaveValue("1001");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("guarda a escolha e avisa quem depende dela", async () => {
    const onChange = vi.fn();
    render(
      <SeletorDeAluno vinculados={["1001", "1002"]} onChange={onChange} />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Aluno"), "1002");

    expect(screen.getByLabelText("Aluno")).toHaveValue("1002");
    expect(onChange).toHaveBeenCalledWith("1002");
    expect(window.localStorage.getItem(CHAVE)).toBe("1002");
  });

  it("retoma a escolha guardada de uma visita anterior", () => {
    window.localStorage.setItem(CHAVE, "1002");

    render(<SeletorDeAluno vinculados={["1001", "1002"]} />);

    expect(screen.getByLabelText("Aluno")).toHaveValue("1002");
  });

  it("ignora escolha guardada de um vínculo que não existe mais", () => {
    // Filho que saiu da escola: o valor velho no navegador não pode manter
    // o contexto num aluno ao qual o responsável não tem mais acesso.
    window.localStorage.setItem(CHAVE, "9999");

    render(<SeletorDeAluno vinculados={["1001", "1002"]} />);

    expect(screen.getByLabelText("Aluno")).toHaveValue("1001");
  });
});
