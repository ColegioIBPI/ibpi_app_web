import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { LinhaDoBoletim } from "@/core/modelo";
import { Boletim } from "@/features/notas/components/boletim";

const linha = (
  disciplinaId: string,
  disciplinaNome: string,
  medias: Record<string, number | null> = {},
  extra: Partial<LinhaDoBoletim> = {},
): LinhaDoBoletim =>
  ({
    disciplinaId,
    disciplinaNome,
    trimestres: {
      "1": { projeto: 7.83, tarefas: 10, av: 7.6 },
    },
    mediasPorTrimestre: medias,
    mediaAnual: extra.mediaAnual ?? null,
    mediaParcial: extra.mediaParcial ?? null,
    recuperacao: extra.recuperacao ?? null,
    mediaFinal: extra.mediaFinal ?? null,
    faltas: 0,
    situacao: extra.situacao ?? "cursando",
  }) as LinhaDoBoletim;

function montar(props: Partial<Parameters<typeof Boletim>[0]> = {}) {
  return render(
    <Boletim
      nome="Alice Vianna Fernandes Bezerra Giesteira"
      matricula="26007"
      segmentoRotulo="Ensino Médio"
      serie="1"
      turmaCodigo="EM1A"
      anoLetivo={2026}
      dataMatricula="2026-12-19"
      disciplinas={[
        linha("portugues", "Português/Literatura", { "1": 8.48 }, {
          mediaParcial: 8.48,
        }),
        linha("educacao-fisica", "Educação Física"),
      ]}
      faltasPorTrimestre={{ "1": 8, "2": 0, "3": 0 }}
      percentualDeFrequencia={0.9}
      situacao="cursando"
      {...props}
    />,
  );
}

// O nome da disciplina aparece duas vezes — na grade e no rótulo do
// gráfico. Aqui interessa a linha da grade, que é um `rowheader`.
const linhaDe = (nome: string) =>
  screen.getByRole("rowheader", { name: nome }).closest("tr")!;

describe("Boletim", () => {
  it("traz a identificação do aluno na faixa do topo", () => {
    montar();

    expect(
      screen.getByText("Alice Vianna Fernandes Bezerra Giesteira"),
    ).toBeVisible();
    expect(screen.getByText("26007")).toBeVisible();
    expect(screen.getByText("Ensino Médio")).toBeVisible();
    expect(screen.getByText("EM1A")).toBeVisible();
  });

  it("escreve a série como o colégio escreve", () => {
    // No boletim do colégio está "1a SÉRIE", não "1".
    montar();
    expect(screen.getByText("1ª SÉRIE")).toBeVisible();

    montar({ serie: "Ensino Médio Noturno" });
    expect(screen.getByText("Ensino Médio Noturno")).toBeVisible();
  });

  it("mostra as notas com duas casas, como o documento do colégio", () => {
    montar();

    const portugues = linhaDe("Português/Literatura");
    expect(within(portugues).getByText("7,83")).toBeVisible();
    expect(within(portugues).getByText("10,00")).toBeVisible();
    expect(within(portugues).getAllByText("8,48").length).toBeGreaterThan(0);
  });

  it("deixa a célula em branco quando não há nota, sem travessão", () => {
    // Um travessão em toda a grade de um aluno do 1º trimestre polui o
    // documento inteiro.
    montar();

    const educacao = linhaDe("Educação Física");
    expect(within(educacao).queryByText("—")).not.toBeInTheDocument();
  });

  it("não declara situação enquanto o ano não fecha", () => {
    montar();

    expect(screen.queryByText("Cursando")).not.toBeInTheDocument();
  });

  it("declara a situação quando a média anual existe", () => {
    montar({
      disciplinas: [
        linha("fisica", "Física", { "1": 8, "2": 8, "3": 8 }, {
          mediaAnual: 8,
          mediaParcial: 8,
          mediaFinal: 8,
          situacao: "aprovado",
        }),
      ],
    });

    expect(within(linhaDe("Física")).getByText("Aprovado")).toBeVisible();
  });

  it("mostra as faltas do trimestre na linha de faltas", () => {
    montar();

    expect(within(linhaDe("Faltas")).getByText("8")).toBeVisible();
  });

  it("traz a linha do Projeto Bilíngue com a média dos componentes", () => {
    montar({
      projetoBilingue: {
        nivel: "N2",
        componentes: [
          { nome: "STEAM", trimestres: { "1": 8.25 }, recuperacao: null },
          { nome: "ENGLISH", trimestres: { "1": 9.5 }, recuperacao: null },
          { nome: "PROJECT", trimestres: { "1": 9.5 }, recuperacao: null },
        ],
      },
    });

    // 8,25 + 9,50 + 9,50 dão os 9,08 que o boletim do colégio estampa.
    expect(within(linhaDe("Projeto Bilíngue")).getAllByText("9,08").length).toBe(
      2,
    );
    expect(screen.getByText("IBEU N2")).toBeVisible();
  });

  it("mantém as linhas em branco dos blocos de preencher à mão", () => {
    montar({
      eletivas: [{ nome: "Francês", periodo: "2026.02", situacao: "cursando" }],
    });

    expect(screen.getByText("FRANCÊS 2026.02")).toBeVisible();
    expect(screen.getByText("CURSANDO")).toBeVisible();

    // O formulário impresso sempre tem linhas sobrando para escrever.
    const eletivas = screen.getByText("ELETIVA").closest("table")!;
    expect(within(eletivas).getAllByRole("row").length).toBeGreaterThan(2);
  });

  it("mostra a data de matrícula e o aviso do rodapé", () => {
    montar();

    expect(screen.getByText(/Matriculado em: 19\/12\/2026/)).toBeVisible();
    expect(
      screen.getByText(/sem valor legal/),
    ).toBeVisible();
  });

  it("desenha o gráfico de médias", () => {
    montar();

    expect(
      screen.getByRole("img", { name: "Média anual por disciplina" }),
    ).toBeInTheDocument();
  });

  it("sai em paisagem: a classe que o CSS de impressão usa está no documento", () => {
    const { container } = montar();

    expect(container.querySelector("article.boletim")).toBeTruthy();
  });
});
