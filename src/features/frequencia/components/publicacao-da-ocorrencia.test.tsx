import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicacaoDaOcorrencia } from "@/features/frequencia/components/publicacao-da-ocorrencia";

const alterar = vi.hoisted(() => vi.fn(async () => ({ ok: true })));

vi.mock("@/features/frequencia/actions/ocorrencias", () => ({
  alterarPublicacao: alterar,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

beforeEach(() => alterar.mockClear());

describe("publicação na lista de ocorrências", () => {
  it("reflete a ocorrência antiga: responsável sim, aluno não", () => {
    render(
      <PublicacaoDaOcorrencia id="o1" ocorrencia={{}} podeEditar />,
    );

    expect(screen.getByLabelText("Responsável")).toBeChecked();
    expect(screen.getByLabelText("Aluno")).not.toBeChecked();
  });

  it("reter do responsável não libera para o aluno", async () => {
    // O ponto sutil: cada caixa grava as **duas**, e o lado que não foi
    // tocado precisa ir como está na tela. Mandá-lo `undefined` faria o
    // schema devolver o padrão e republicar o que ninguém pediu.
    const usuario = userEvent.setup({ delay: null });

    render(
      <PublicacaoDaOcorrencia
        id="o1"
        ocorrencia={{ visivelParaResponsavel: true, visivelParaAluno: true }}
        podeEditar
      />,
    );

    await usuario.click(screen.getByLabelText("Responsável"));

    expect(alterar).toHaveBeenCalledWith({
      id: "o1",
      visivelParaResponsavel: false,
      visivelParaAluno: true,
    });
  });

  it("liberar para o aluno preserva a retenção do responsável", async () => {
    const usuario = userEvent.setup({ delay: null });

    render(
      <PublicacaoDaOcorrencia
        id="o1"
        ocorrencia={{ visivelParaResponsavel: false, visivelParaAluno: false }}
        podeEditar
      />,
    );

    await usuario.click(screen.getByLabelText("Aluno"));

    expect(alterar).toHaveBeenCalledWith({
      id: "o1",
      visivelParaResponsavel: false,
      visivelParaAluno: true,
    });
  });

  it("mostra o erro do servidor sem mudar a caixa", async () => {
    alterar.mockResolvedValueOnce({
      ok: false,
      erro: "Esta ocorrência não é de uma turma sua.",
    } as never);

    const usuario = userEvent.setup({ delay: null });

    render(
      <PublicacaoDaOcorrencia
        id="o1"
        ocorrencia={{ visivelParaResponsavel: true, visivelParaAluno: false }}
        podeEditar
      />,
    );

    await usuario.click(screen.getByLabelText("Aluno"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "não é de uma turma sua",
    );
    // O estado só muda quando o servidor confirma.
    expect(screen.getByLabelText("Aluno")).not.toBeChecked();
  });

  it("quem não lança só lê o resumo", () => {
    render(
      <PublicacaoDaOcorrencia
        id="o1"
        ocorrencia={{ visivelParaResponsavel: false, visivelParaAluno: false }}
        podeEditar={false}
      />,
    );

    expect(screen.getByText("Só a equipe")).toBeInTheDocument();
    expect(screen.queryByLabelText("Aluno")).not.toBeInTheDocument();
  });
});
