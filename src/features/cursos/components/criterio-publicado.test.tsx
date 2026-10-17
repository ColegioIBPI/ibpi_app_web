import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CriterioComId } from "@/core/modelo";
import { CriterioPublicado } from "@/features/cursos/components/criterio-publicado";

function criterio(extra: Partial<CriterioComId> = {}): CriterioComId {
  return {
    id: "2026",
    anoLetivo: 2026,
    cursoCodigo: null,
    periodos: 3,
    nomeDoPeriodo: "Trimestre",
    avaliacoes: [
      { nome: "Projeto", peso: "1/3 da média", descricao: null },
      { nome: "Tarefas", peso: "1/3 da média", descricao: null },
      { nome: "AV", peso: "1/3 da média", descricao: null },
    ],
    mediaMinima: 5,
    frequenciaMinima: 75,
    comoSeCalcula: "Média do período = (Projeto + Tarefas + AV) ÷ 3",
    recuperacao: "Apenas recuperação final.",
    observacoes: null,
    publicado: true,
    origem: "portal",
    ...extra,
  } as CriterioComId;
}

describe("critério publicado", () => {
  it("mostra períodos, média e frequência", () => {
    render(<CriterioPublicado criterio={criterio()} />);

    expect(screen.getByText("3 trimestres")).toBeInTheDocument();
    expect(screen.getByText("5,0")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("lista o que compõe a média", () => {
    render(<CriterioPublicado criterio={criterio()} />);

    expect(screen.getByText("Projeto")).toBeInTheDocument();
    expect(screen.getByText("AV")).toBeInTheDocument();
    expect(
      screen.getByText("O que compõe a média do trimestre"),
    ).toBeInTheDocument();
  });

  it("não pluraliza período único", () => {
    render(
      <CriterioPublicado
        criterio={criterio({ periodos: 1, nomeDoPeriodo: "Módulo" })}
      />,
    );

    expect(screen.getByText("1 módulo")).toBeInTheDocument();
  });

  it("usa vírgula decimal, como o boletim imprime", () => {
    render(
      <CriterioPublicado
        criterio={criterio({ mediaMinima: 6.5, frequenciaMinima: 72.5 })}
      />,
    );

    expect(screen.getByText("6,5")).toBeInTheDocument();
    expect(screen.getByText("72,5%")).toBeInTheDocument();
  });

  it("sem critério publicado, não ocupa espaço nenhum", () => {
    // A família que não tem critério publicado vê o boletim como antes,
    // sem um bloco vazio dizendo que falta alguma coisa.
    const { container } = render(<CriterioPublicado criterio={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("não é escondido na impressão", () => {
    // A pergunta "como essa média foi calculada?" aparece com o boletim na
    // mão, e a resposta numa outra tela não chega a quem imprimiu.
    const { container } = render(<CriterioPublicado criterio={criterio()} />);

    expect(
      container.querySelector('[data-impressao="ocultar"]'),
    ).toBeNull();
  });
});

describe("sem separador — dentro de um cartão", () => {
  it("não repete o título, que já está no cabeçalho do cartão", () => {
    render(<CriterioPublicado criterio={criterio()} semSeparador />);

    expect(screen.queryByText("Como o aluno é avaliado")).not.toBeInTheDocument();
    expect(screen.getByText("3 trimestres")).toBeInTheDocument();
  });

  it("com separador, o título aparece", () => {
    // No boletim ele vem depois das notas e precisa do título para não
    // parecer continuação da tabela.
    render(<CriterioPublicado criterio={criterio()} />);

    expect(screen.getByText("Como o aluno é avaliado")).toBeInTheDocument();
  });
});
