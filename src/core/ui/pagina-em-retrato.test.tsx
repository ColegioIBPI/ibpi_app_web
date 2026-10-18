import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PaginaEmRetrato } from "@/core/ui/pagina-em-retrato";

describe("página em retrato", () => {
  it("declara o @page da rota", () => {
    // `@page` é do documento inteiro e não aceita seletor: a única forma
    // de trocá-lo por rota é a rota declarar o seu, que vence o do
    // globals.css por vir depois.
    const { container } = render(<PaginaEmRetrato />);
    const estilo = container.querySelector("style");

    expect(estilo?.textContent).toContain("size: A4 portrait");
  });

  it("sai do DOM quando a rota sai", () => {
    // Senão navegar da ficha para o boletim levaria o retrato junto, e o
    // boletim não cabe em retrato.
    const { container, unmount } = render(<PaginaEmRetrato />);
    expect(container.querySelector("style")).not.toBeNull();

    unmount();
    expect(container.querySelector("style")).toBeNull();
  });
});
