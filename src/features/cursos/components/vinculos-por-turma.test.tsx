import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  VinculosPorTurma,
  type TurmaComVinculos,
} from "@/features/cursos/components/vinculos-por-turma";

const trocar = vi.hoisted(() => vi.fn(async () => ({ ok: true, id: "nova" })));
const remover = vi.hoisted(() => vi.fn(async () => ({ ok: true })));
const alocar = vi.hoisted(() => vi.fn(async () => ({ ok: true })));

vi.mock("@/features/professores/actions/professores", () => ({
  trocarProfessor: trocar,
  removerAlocacao: remover,
  alocarProfessor: alocar,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const TURMA: TurmaComVinculos = {
  id: "2026-EM1A",
  codigo: "EM1A",
  anoLetivo: 2026,
  cursoRotulo: "Ensino Médio",
  vinculos: [
    {
      id: "2026-juarez-2026-EM1A-matematica",
      disciplinaId: "matematica",
      disciplinaNome: "Matemática",
      professorId: "juarez",
      professorNome: "Juarez Silva",
    },
  ],
};

const PROFESSORES = [
  { valor: "juarez", rotulo: "Juarez Silva" },
  { valor: "ana", rotulo: "Ana Ribeiro" },
];

const montar = () =>
  render(
    <VinculosPorTurma
      turmas={[TURMA]}
      professores={PROFESSORES}
      disciplinas={[{ valor: "portugues", rotulo: "Português" }]}
    />,
  );

const digitando = () => userEvent.setup({ delay: null });

describe("troca de professor", () => {
  it("o painel nasce fechado", () => {
    montar();

    expect(
      screen.queryByLabelText(/Novo professor de Matemática/),
    ).not.toBeInTheDocument();
  });

  it("troca numa ação só, mandando o vínculo e o professor novo", () => {
    // O ponto da tarefa: era vincular e desvincular à mão, e na ordem
    // errada a disciplina sumia do boletim até o vínculo novo entrar.
    const usuario = digitando();

    return (async () => {
      montar();

      await usuario.click(
        screen.getByRole("button", { name: /Trocar professor/ }),
      );
      await usuario.selectOptions(
        screen.getByLabelText(/Novo professor de Matemática/),
        "ana",
      );
      await usuario.click(screen.getByRole("button", { name: "Trocar" }));

      expect(trocar).toHaveBeenCalledWith(
        "2026-juarez-2026-EM1A-matematica",
        "ana",
      );
      expect(remover).not.toHaveBeenCalled();
    })();
  });

  it("não oferece quem já leciona a disciplina", async () => {
    // A ação recusaria, e oferecer o que vai ser recusado é convidar ao
    // erro — a mesma regra do formulário de vínculo novo.
    const usuario = digitando();
    montar();

    await usuario.click(
      screen.getByRole("button", { name: /Trocar professor/ }),
    );

    const opcoes = screen.getByLabelText(/Novo professor de Matemática/);
    expect(opcoes).not.toHaveTextContent("Juarez Silva");
    expect(opcoes).toHaveTextContent("Ana Ribeiro");
  });

  it("não troca sem escolher o professor", async () => {
    const usuario = digitando();
    montar();

    await usuario.click(
      screen.getByRole("button", { name: /Trocar professor/ }),
    );

    expect(screen.getByRole("button", { name: "Trocar" })).toBeDisabled();
  });

  it("responde ali mesmo a dúvida que leva ao suporte", async () => {
    // "Perde o que o professor anterior lançou?" aparece com o dedo sobre
    // o botão, não na hora de ler o manual.
    const usuario = digitando();
    montar();

    await usuario.click(
      screen.getByRole("button", { name: /Trocar professor/ }),
    );

    expect(
      screen.getByText(/notas, a chamada e as ocorrências continuam/i),
    ).toBeInTheDocument();
  });

  it("mostra o erro do servidor sem fechar o painel", async () => {
    trocar.mockResolvedValueOnce({
      ok: false,
      erro: "Ana Ribeiro está inativa no cadastro.",
    } as never);

    const usuario = digitando();
    montar();

    await usuario.click(
      screen.getByRole("button", { name: /Trocar professor/ }),
    );
    await usuario.selectOptions(
      screen.getByLabelText(/Novo professor de Matemática/),
      "ana",
    );
    await usuario.click(screen.getByRole("button", { name: "Trocar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "está inativa no cadastro",
    );
  });

  it("desvincular continua existindo — disciplina pode ficar sem professor", async () => {
    const usuario = digitando();
    montar();

    await usuario.click(screen.getByRole("button", { name: /Desvincular/ }));

    expect(remover).toHaveBeenCalledWith(
      "juarez",
      "2026-juarez-2026-EM1A-matematica",
    );
  });
});
