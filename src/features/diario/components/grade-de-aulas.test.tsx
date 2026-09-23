import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Aula } from "@/core/modelo";
import { GradeDeAulas } from "@/features/diario/components/grade-de-aulas";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const registrarAula = vi.fn();
const registrarConteudo = vi.fn();
const registrarChamadaDaAula = vi.fn();
const removerAula = vi.fn();

vi.mock("@/features/diario/actions/diario", () => ({
  registrarAula: (dados: unknown) => registrarAula(dados),
  registrarConteudo: (dados: unknown) => registrarConteudo(dados),
  registrarChamadaDaAula: (dados: unknown) => registrarChamadaDaAula(dados),
  removerAula: (dados: unknown) => removerAula(dados),
}));

const ALUNOS = [
  { matricula: "25047", nome: "Ana Souza" },
  { matricula: "26007", nome: "Bruno Lima" },
];

const aula = (numero: number, data: string, extra: Partial<Aula> = {}): Aula => ({
  numero,
  data,
  conteudo: extra.conteudo ?? "Leis de Newton",
  semAula: extra.semAula ?? null,
  presencas: extra.presencas ?? {},
});

function montar(aulas: Aula[]) {
  return render(
    <GradeDeAulas
      alocacaoId="2026-prof1-EM1A-fisica"
      trimestre={2}
      aulas={aulas}
      alunos={ALUNOS}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const acao of [
    registrarAula,
    registrarConteudo,
    registrarChamadaDaAula,
    removerAula,
  ]) {
    acao.mockResolvedValue({ ok: true });
  }
});

describe("GradeDeAulas", () => {
  it("mostra o estado vazio antes da primeira aula", () => {
    montar([]);

    expect(screen.getByText("Nenhuma aula registrada")).toBeInTheDocument();
  });

  it("envia a lista completa de faltas, não só a marcada", async () => {
    // Mandar apenas a diferença faria a correção de uma falta na tela nunca
    // chegar ao banco.
    montar([aula(1, "2026-05-11", { presencas: { "25047": false } })]);

    await userEvent.click(screen.getByRole("button", { name: /Aula 1/ }));
    await userEvent.click(screen.getByRole("button", { name: "Bruno Lima" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar chamada" }));

    expect(registrarChamadaDaAula).toHaveBeenCalledWith({
      alocacaoId: "2026-prof1-EM1A-fisica",
      trimestre: 2,
      numero: 1,
      faltas: ["25047", "26007"],
    });
  });

  it("desmarcar uma falta manda a lista sem ela", async () => {
    montar([aula(1, "2026-05-11", { presencas: { "25047": false } })]);

    await userEvent.click(screen.getByRole("button", { name: /Aula 1/ }));
    await userEvent.click(screen.getByRole("button", { name: "Ana Souza" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar chamada" }));

    expect(registrarChamadaDaAula).toHaveBeenCalledWith(
      expect.objectContaining({ faltas: [] }),
    );
  });

  it("dia sem aula não oferece chamada", async () => {
    montar([aula(1, "2026-05-11", { semAula: "recesso", conteudo: "" })]);

    await userEvent.click(screen.getByRole("button", { name: /Aula 1/ }));

    expect(
      screen.queryByRole("button", { name: "Salvar chamada" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/não entra no cálculo de frequência/)).toBeVisible();
  });

  it("aponta as aulas letivas sem conteúdo", () => {
    montar([
      aula(1, "2026-05-11", { conteudo: "" }),
      aula(2, "2026-05-15", { semAula: "feriado", conteudo: "" }),
    ]);

    expect(
      screen.getByText("A aula 1 ainda está sem conteúdo registrado."),
    ).toBeInTheDocument();
  });

  it("mostra a frequência de cada aluno, contando só as aulas letivas", () => {
    montar([
      aula(1, "2026-05-11", { presencas: { "26007": false } }),
      aula(2, "2026-05-15", { semAula: "ferias" }),
      aula(3, "2026-05-18"),
    ]);

    const bruno = screen.getByText("Bruno Lima").closest("li")!;
    // Uma falta em duas aulas letivas — o dia de férias não entra.
    expect(within(bruno).getByText("50%")).toBeInTheDocument();

    const ana = screen.getByText("Ana Souza").closest("li")!;
    expect(within(ana).getByText("100%")).toBeInTheDocument();
  });

  it("exige a data para registrar aula", async () => {
    montar([]);

    await userEvent.click(screen.getByRole("button", { name: /Registrar aula/ }));

    expect(registrarAula).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escolha a data da aula.",
    );
  });

  it("mostra o erro devolvido pela ação", async () => {
    registrarConteudo.mockResolvedValue({
      ok: false,
      erro: "Este diário é de outro professor.",
    });

    montar([aula(1, "2026-05-11")]);

    await userEvent.click(screen.getByRole("button", { name: /Aula 1/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "Salvar conteúdo" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Este diário é de outro professor.",
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
