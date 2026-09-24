import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

/*
 * O jsdom não implementa `<dialog>.showModal()` nem `.close()`.
 *
 * Sem isto, qualquer tela que use o `Modal` quebra no teste com
 * "showModal is not a function" — e a alternativa seria trocar o `<dialog>`
 * nativo por uma div, perdendo foco preso, Escape e camada de fundo que o
 * navegador já dá de graça.
 *
 * O polyfill só liga o método ao atributo `open`, que é o que a nossa
 * implementação observa.
 */
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function showModal(
    this: HTMLDialogElement,
  ) {
    this.open = true;
  };

  HTMLDialogElement.prototype.close ??= function close(
    this: HTMLDialogElement,
    valorDeRetorno?: string,
  ) {
    this.open = false;
    if (valorDeRetorno !== undefined) this.returnValue = valorDeRetorno;
    this.dispatchEvent(new Event("close"));
  };
}
