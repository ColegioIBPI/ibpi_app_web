import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ReciboComId } from "@/core/modelo";
import { ReciboImpresso } from "@/features/recibos/components/recibo-impresso";

function recibo(extra: Partial<ReciboComId> = {}): ReciboComId {
  return {
    id: "A-000042",
    serie: "A",
    numero: 42,
    status: "confirmado",
    emissorUid: "u-1",
    emissorNome: "Cristiana Dieguez",
    emitidoEm: "2026-03-10T12:00:00.000Z",
    aluno: {
      matricula: "26031",
      nome: "Alice Vianna",
      curso: "medio",
      serie: "1",
    },
    itens: [
      {
        servico: "mensalidade",
        referencia: "Parcela 5/12",
        formaDePagamento: "pix",
        referenciaDoPagamento: "E1234",
        valor: 1923,
        cobrancaId: "c-5",
      },
      {
        servico: "taxa-de-material",
        referencia: null,
        formaDePagamento: "credito-visa",
        referenciaDoPagamento: null,
        valor: 77.5,
        cobrancaId: null,
      },
    ],
    observacoes: null,
    cancelamento: null,
    origem: "portal",
    ...extra,
  } as ReciboComId;
}

describe("recibo impresso", () => {
  it("mostra cabeçalho, itens e total somado", () => {
    render(<ReciboImpresso recibo={recibo()} />);

    expect(screen.getByText("Série A · nº 42")).toBeInTheDocument();
    expect(screen.getByText("Alice Vianna")).toBeInTheDocument();
    expect(screen.getByText("26031")).toBeInTheDocument();
    expect(screen.getByText("Ensino Médio · 1")).toBeInTheDocument();

    expect(screen.getByText("Mensalidade")).toBeInTheDocument();
    expect(screen.getByText("Parcela 5/12")).toBeInTheDocument();
    expect(screen.getByText("Cartão de Crédito Visa")).toBeInTheDocument();

    // 1923 + 77,50 — a soma é a mesma função que o servidor usa.
    expect(screen.getByText("R$ 2.000,50")).toBeInTheDocument();
  });

  it("mostra quem emitiu, porque é a assinatura do documento", () => {
    render(<ReciboImpresso recibo={recibo()} />);

    expect(screen.getByText("por Cristiana Dieguez")).toBeInTheDocument();
  });

  it("estampa o cancelamento no documento, com motivo", () => {
    // A 2ª via de um recibo cancelado circula: quem recebe precisa ver na
    // primeira olhada que ela não vale.
    render(
      <ReciboImpresso
        recibo={recibo({
          status: "cancelado",
          cancelamento: {
            em: "2026-03-11T12:00:00.000Z",
            porNome: "Cristiana Dieguez",
            motivo: "valor digitado errado",
          },
        })}
      />,
    );

    expect(screen.getByText(/RECIBO CANCELADO/)).toBeInTheDocument();
    expect(
      screen.getByText(/valor digitado errado/),
    ).toBeInTheDocument();
  });

  it("aguenta aluno sem curso e sem série", () => {
    // Os migrados do Access nem sempre têm os dois campos, e o recibo não
    // pode quebrar por causa disso.
    render(
      <ReciboImpresso
        recibo={recibo({
          aluno: {
            matricula: "26031",
            nome: "Alice Vianna",
            curso: null,
            serie: null,
          },
        })}
      />,
    );

    // Pelo rótulo, e não por "—" solto: a coluna de referência do item
    // também mostra travessão, e a asserção pegaria a errada.
    const rotulo = screen.getByText("Curso e série");
    expect(rotulo.nextElementSibling).toHaveTextContent("—");
  });
});
