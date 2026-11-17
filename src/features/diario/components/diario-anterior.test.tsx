import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DiarioAnterior } from "@/features/diario/components/diario-anterior";

const aula = (numero: number, campos: Record<string, unknown> = {}) => ({
  numero,
  data: `2026-03-${String(numero).padStart(2, "0")}`,
  faltas: 0,
  conteudo: `Conteúdo da aula ${numero}`,
  temConteudo: true,
  semAula: null,
  ...campos,
});

const anterior = (campos: Record<string, unknown> = {}) => ({
  alocacaoId: "2026-ana-2026-EM1A-matematica",
  professorNome: "Ana Ribeiro",
  ativa: false,
  aulas: [aula(1), aula(2)],
  ...campos,
});

describe("diário anterior", () => {
  it("nasce fechado — quem abre a tela vem lançar a aula de hoje", () => {
    const { container } = render(
      <DiarioAnterior anteriores={[anterior() as never]} />,
    );

    expect(container.querySelector("details")).not.toHaveAttribute("open");
  });

  it("nomeia o professor e conta as aulas no cabeçalho", () => {
    // É o que se lê fechado, e é o que faz alguém decidir abrir.
    render(<DiarioAnterior anteriores={[anterior() as never]} />);

    expect(screen.getByText(/Ana Ribeiro/)).toBeInTheDocument();
    expect(screen.getByText(/2 aulas/)).toBeInTheDocument();
  });

  it("diz se o professor ainda leciona", () => {
    // Muda o que o leitor faz com a informação: com o colega na escola, a
    // conversa resolve; sem ele, este texto é tudo o que restou.
    render(<DiarioAnterior anteriores={[anterior() as never]} />);
    expect(screen.getByText(/não leciona mais/)).toBeInTheDocument();
  });

  it("marca o colega que ainda leciona", () => {
    render(<DiarioAnterior anteriores={[anterior({ ativa: true }) as never]} />);
    expect(screen.getByText(/ainda leciona/)).toBeInTheDocument();
  });

  it("mostra o conteúdo de cada aula, com número e data", () => {
    render(<DiarioAnterior anteriores={[anterior() as never]} />);

    expect(screen.getByText("Conteúdo da aula 1")).toBeInTheDocument();
    expect(screen.getByText(/1ª · 01\/03\/2026/)).toBeInTheDocument();
  });

  it("aula sem conteúdo diz isso, em vez de sair em branco", () => {
    render(
      <DiarioAnterior
        anteriores={[
          anterior({
            aulas: [aula(1, { conteudo: null, temConteudo: false })],
          }) as never,
        ]}
      />,
    );

    expect(screen.getByText("Conteúdo não registrado")).toBeInTheDocument();
  });

  it("dia sem aula aparece pelo motivo", () => {
    render(
      <DiarioAnterior
        anteriores={[
          anterior({
            aulas: [aula(1, { conteudo: null, semAula: "feriado" })],
          }) as never,
        ]}
      />,
    );

    expect(screen.getByText("Feriado")).toBeInTheDocument();
  });

  it("a falta aparece em número, e só quando houve", () => {
    // Não é para reabrir a chamada de quem saiu: a falta continua contando
    // para o aluno pela frequência da disciplina.
    render(
      <DiarioAnterior
        anteriores={[
          anterior({ aulas: [aula(1, { faltas: 3 }), aula(2)] }) as never,
        ]}
      />,
    );

    expect(screen.getByText("3 faltas")).toBeInTheDocument();
    expect(screen.queryByText("0 faltas")).not.toBeInTheDocument();
  });

  it("sem diário anterior, não sobra cabeçalho nem moldura", () => {
    // Disciplina que nunca trocou de professor é o caso normal, e um
    // bloco vazio "Diário anterior" em toda tela ensina a ignorá-lo.
    const { container } = render(<DiarioAnterior anteriores={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("dois professores anteriores viram dois blocos", () => {
    render(
      <DiarioAnterior
        anteriores={[
          anterior({ alocacaoId: "a", professorNome: "Ana" }) as never,
          anterior({ alocacaoId: "b", professorNome: "Bruno" }) as never,
        ]}
      />,
    );

    expect(screen.getAllByRole("group")).toHaveLength(2);
  });
});
