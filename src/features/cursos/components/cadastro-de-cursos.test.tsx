import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CadastroDeCursos } from "@/features/cursos/components/cadastro-de-cursos";
import type { CursoDaLista } from "@/features/cursos/domain/curso";

vi.mock("@/features/cursos/actions/cursos", () => ({
  alternarCurso: vi.fn(),
  criarCurso: vi.fn(),
  editarCurso: vi.fn(),
  semearCursos: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const curso = (
  codigo: string,
  nome: string,
  gravado: boolean,
): CursoDaLista => ({
  id: codigo,
  codigo,
  nome,
  sigla: null,
  ordem: null,
  ativo: true,
  origem: "portal",
  gravado,
});

/** O estado que a escola relatou: um curso próprio e os quatro por gravar. */
const MISTO = [
  curso("personalizado", "Personalizado", true),
  curso("fundamental", "Ensino Fundamental", false),
  curso("medio", "Ensino Médio", false),
];

describe("cadastro misto — gravados e por gravar", () => {
  it("mostra os dois: criar um curso próprio não some com os outros", () => {
    // O defeito relatado: "ao criar um novo curso Personalizado, os
    // outros cursos sumiram da listagem".
    render(<CadastroDeCursos cursos={MISTO} />);

    expect(screen.getByText("Personalizado")).toBeInTheDocument();
    expect(screen.getByText("Ensino Fundamental")).toBeInTheDocument();
    expect(screen.getByText("Ensino Médio")).toBeInTheDocument();
  });

  it("oferece gravar, nomeando o que falta", () => {
    render(<CadastroDeCursos cursos={MISTO} />);

    expect(
      screen.getByRole("button", { name: /Gravar os cursos atuais/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ensino Fundamental, Ensino Médio/),
    ).toBeInTheDocument();
  });

  it("não diz 'estes quatro' — depois de gravar parte, viraria mentira", () => {
    render(
      <CadastroDeCursos
        cursos={[
          curso("fundamental", "Ensino Fundamental", true),
          curso("medio", "Ensino Médio", false),
        ]}
      />,
    );

    expect(screen.getByText(/Ensino Médio vem do código/)).toBeInTheDocument();
  });

  it("trava renomear e encerrar linha a linha, não na tela inteira", () => {
    // O curso gravado é editável mesmo com outros por gravar: antes a
    // trava era da tela, e "Personalizado" ficava travado junto.
    render(<CadastroDeCursos cursos={MISTO} />);

    const renomear = screen.getAllByRole("button", { name: /Renomear/ });

    expect(renomear).toHaveLength(3);
    expect(renomear[0]).toBeEnabled(); // Personalizado, gravado
    expect(renomear[1]).toBeDisabled(); // ainda não é documento
    expect(renomear[2]).toBeDisabled();
  });
});

describe("cadastro completo", () => {
  const COMPLETO = [
    curso("fundamental", "Ensino Fundamental", true),
    curso("medio", "Ensino Médio", true),
  ];

  it("não oferece gravar nada", () => {
    render(<CadastroDeCursos cursos={COMPLETO} />);

    expect(
      screen.queryByRole("button", { name: /Gravar os cursos atuais/ }),
    ).not.toBeInTheDocument();
  });

  it("tudo editável", () => {
    render(<CadastroDeCursos cursos={COMPLETO} />);

    for (const botao of screen.getAllByRole("button", { name: /Renomear/ })) {
      expect(botao).toBeEnabled();
    }
  });
});
