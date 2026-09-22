import { describe, expect, it } from "vitest";

import {
  chaveDoResponsavel,
  consolidarResponsaveis,
  montarResponsavel,
} from "@/features/migracao/domain/responsavel";

describe("chaveDoResponsavel", () => {
  it("usa o e-mail quando existe, por ser o que vira login", () => {
    expect(
      chaveDoResponsavel({
        nome: "Sharisy Colavitti",
        parentesco: "Mãe",
        email: "sharisy09@gmail.com ( Mãe",
      }),
    ).toBe("email:sharisy09@gmail.com");
  });

  it("cai no CPF quando não há e-mail", () => {
    expect(
      chaveDoResponsavel({
        nome: "Renata Gobato",
        parentesco: "Mãe",
        email: null,
        cpf: "017.194.250-78",
      }),
    ).toBe("cpf:01719425078");
  });

  it("usa o nome como último recurso", () => {
    expect(
      chaveDoResponsavel({
        nome: "Renata Gobato",
        parentesco: "Mãe",
        email: null,
      }),
    ).toBe("nome:RENATA GOBATO");
  });

  it("não gera chave para o campo de placeholder", () => {
    expect(
      chaveDoResponsavel({
        nome: "////////////////////////",
        parentesco: "/////",
        email: null,
      }),
    ).toBeNull();
  });
});

describe("montarResponsavel", () => {
  it("limpa todos os campos de uma vez", () => {
    expect(
      montarResponsavel({
        nome: "RENATA  GOBATO ",
        parentesco: "Mãe",
        email: "regobato@gmail.com ( Mãe",
        telefone: "(61)99976-0810",
        cpf: "017.194.250-78",
      }),
    ).toEqual({
      id: "email-regobato-gmail-com",
      nome: "Renata Gobato",
      parentesco: "Mãe",
      email: "regobato@gmail.com",
      telefone: "+5561999760810",
      cpf: "01719425078",
    });
  });

  it("descarta o segundo responsável preenchido com barras", () => {
    expect(
      montarResponsavel({
        nome: "////////////////////////",
        parentesco: "/////////////////",
        email: null,
      }),
    ).toBeNull();
  });
});

describe("consolidarResponsaveis — irmãos", () => {
  // Caso real: Pedro e Yuri Colavitti Antunes, mesma mãe, nome grafado
  // diferente em cada cadastro, mesmo e-mail.
  const doPedro = montarResponsavel({
    nome: "Sharisy Colavitti Antunes",
    parentesco: "Mãe",
    email: "sharisy09@gmail.com ( Mãe",
    telefone: "(21)96723-6803",
  })!;

  const doYuri = montarResponsavel({
    nome: "Sarisy Colavitti Antunes",
    parentesco: "Mãe",
    email: "sharisy09@gmail.com",
    cpf: "053.212.307-73",
  })!;

  it("vira um responsável só", () => {
    const consolidados = consolidarResponsaveis([doPedro, doYuri]);

    expect(consolidados).toHaveLength(1);
    expect(consolidados[0].email).toBe("sharisy09@gmail.com");
  });

  it("completa os campos que faltavam em um dos cadastros", () => {
    const [responsavel] = consolidarResponsaveis([doPedro, doYuri]);

    // Telefone veio do cadastro do Pedro, CPF do cadastro do Yuri.
    expect(responsavel.telefone).toBe("+5521967236803");
    expect(responsavel.cpf).toBe("05321230773");
  });

  it("mantém separados responsáveis de famílias diferentes", () => {
    const outro = montarResponsavel({
      nome: "Renata Gobato",
      parentesco: "Mãe",
      email: "regobato@gmail.com",
    })!;

    expect(consolidarResponsaveis([doPedro, doYuri, outro])).toHaveLength(2);
  });

  it("não quebra com lista vazia", () => {
    expect(consolidarResponsaveis([])).toEqual([]);
  });
});
