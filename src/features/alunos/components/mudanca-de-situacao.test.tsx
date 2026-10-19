import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MudancaDeSituacao } from "@/features/alunos/components/mudanca-de-situacao";

const alterar = vi.hoisted(() =>
  vi.fn(async () => ({ ok: true, alterados: 2 })),
);

vi.mock("@/features/alunos/actions/situacao", () => ({
  alterarSituacaoEmLote: alterar,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const ALUNOS = [
  {
    matricula: "26001",
    nome: "Alice Vianna",
    turmaCodigo: "EM3A",
    serie: "3",
    situacaoMatricula: "ativa" as const,
  },
  {
    matricula: "26002",
    nome: "Bruno Lima",
    turmaCodigo: "EM3A",
    serie: "3",
    situacaoMatricula: "ativa" as const,
  },
];

beforeEach(() => alterar.mockClear());

describe("mudança de situação em lote", () => {
  it("abre sem ninguém selecionado", async () => {
    // Encerrar matrícula é ato sobre uma pessoa. Uma tela que já abre com
    // todos marcados encerra a escola inteira no primeiro clique distraído.
    render(<MudancaDeSituacao alunos={ALUNOS} />);

    for (const aluno of ALUNOS) {
      expect(screen.getByRole("checkbox", { name: new RegExp(aluno.nome) })).not.toBeChecked();
    }

    expect(
      screen.getByRole("button", { name: /Aplicar a 0 alunos/ }),
    ).toBeDisabled();
  });

  it("manda só os selecionados", async () => {
    const usuario = userEvent.setup();
    render(<MudancaDeSituacao alunos={ALUNOS} />);

    await usuario.click(
      screen.getByRole("checkbox", { name: /Alice Vianna/ }),
    );
    await usuario.type(screen.getByLabelText(/Data de conclusão/), "2026-07-15");
    await usuario.click(screen.getByRole("button", { name: /Aplicar a 1 aluno/ }));

    expect(alterar).toHaveBeenCalledWith({
      matriculas: ["26001"],
      situacaoMatricula: "concluida",
      dataDaSituacao: "2026-07-15",
    });
  });

  it("selecionar todos marca as caixas, que continuam à vista", async () => {
    // A turma inteira conclui no mesmo dia, e marcar trinta uma a uma é
    // como três ficam para trás. Mas os nomes seguem na tela.
    const usuario = userEvent.setup();
    render(<MudancaDeSituacao alunos={ALUNOS} />);

    await usuario.click(screen.getByRole("button", { name: "Selecionar todos" }));

    expect(screen.getByRole("checkbox", { name: /Alice Vianna/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Bruno Lima/ })).toBeChecked();
    expect(
      screen.getByRole("button", { name: /Aplicar a 2 alunos/ }),
    ).toBeEnabled();
  });

  it("a data muda de nome conforme a situação", async () => {
    const usuario = userEvent.setup();
    render(<MudancaDeSituacao alunos={ALUNOS} />);

    expect(screen.getByLabelText(/Data de conclusão/)).toBeInTheDocument();

    await usuario.selectOptions(
      screen.getByLabelText("Nova situação"),
      "transferida",
    );

    expect(screen.getByLabelText(/Data de transferência/)).toBeInTheDocument();
  });

  it("matrícula ativa não pede data", async () => {
    // Voltar alguém para ativo é correção de engano, e não tem "data do
    // fato" — a data que vale volta a ser a da matrícula.
    const usuario = userEvent.setup();
    render(<MudancaDeSituacao alunos={ALUNOS} />);

    await usuario.selectOptions(screen.getByLabelText("Nova situação"), "ativa");

    expect(screen.getByLabelText(/^Data$/)).toBeDisabled();
  });

  it("avisa quando ninguém mudou", async () => {
    alterar.mockResolvedValueOnce({ ok: true, alterados: 0 });

    const usuario = userEvent.setup();
    render(<MudancaDeSituacao alunos={ALUNOS} />);

    await usuario.click(screen.getByRole("checkbox", { name: /Alice Vianna/ }));
    await usuario.type(screen.getByLabelText(/Data de conclusão/), "2026-07-15");
    await usuario.click(screen.getByRole("button", { name: /Aplicar a 1 aluno/ }));

    expect(
      await screen.findByText(/todos já estavam nessa situação/),
    ).toBeInTheDocument();
  });
});
