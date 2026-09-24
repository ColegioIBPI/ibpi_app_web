import { describe, expect, it } from "vitest";

import { navegacaoPara } from "@/core/auth/navegacao";
import { ROLES } from "@/core/auth/roles";
import {
  iconeDoMenu,
  PADRAO,
  ROTAS_COM_ICONE,
} from "@/core/ui/icones-do-menu";

const todasAsRotas = [
  ...new Set(ROLES.flatMap((role) => navegacaoPara(role).map((i) => i.href))),
];

describe("iconeDoMenu", () => {
  it("todo item do menu tem ícone próprio", () => {
    // O mapa fica num arquivo separado do menu; sem este teste, uma rota
    // nova entra no menu e aparece com o ícone genérico sem ninguém notar.
    const semIcone = todasAsRotas.filter(
      (href) => iconeDoMenu(href) === PADRAO,
    );

    expect(semIcone).toEqual([]);
  });

  it("não sobra ícone de rota que saiu do menu", () => {
    const orfas = ROTAS_COM_ICONE.filter(
      (href) => !todasAsRotas.includes(href),
    );

    expect(orfas).toEqual([]);
  });

  it("rota desconhecida cai no ícone genérico, sem quebrar", () => {
    expect(iconeDoMenu("/gestao/inexistente")).toBe(PADRAO);
  });
});
