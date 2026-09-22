import { describe, expect, it } from "vitest";

import {
  codigoDoErro,
  mensagemDeErroDeAuth,
} from "@/features/auth/domain/mensagens";

const erro = (code: string) => ({ code, message: "irrelevante" });

describe("codigoDoErro", () => {
  it("extrai o código do erro do Firebase", () => {
    expect(codigoDoErro(erro("auth/wrong-password"))).toBe(
      "auth/wrong-password",
    );
  });

  it("devolve null para o que não é erro do Firebase", () => {
    expect(codigoDoErro(new Error("falhou"))).toBeNull();
    expect(codigoDoErro("falhou")).toBeNull();
    expect(codigoDoErro(null)).toBeNull();
    expect(codigoDoErro({ code: 42 })).toBeNull();
  });
});

describe("mensagemDeErroDeAuth", () => {
  it("não revela se o e-mail existe no sistema", () => {
    // Senha errada e usuário inexistente precisam dar a MESMA resposta —
    // caso contrário o formulário vira um verificador de quais e-mails têm
    // conta no colégio.
    const senhaErrada = mensagemDeErroDeAuth(erro("auth/wrong-password"));
    const usuarioInexistente = mensagemDeErroDeAuth(
      erro("auth/user-not-found"),
    );
    const credencialInvalida = mensagemDeErroDeAuth(
      erro("auth/invalid-credential"),
    );

    expect(senhaErrada).toBe(usuarioInexistente);
    expect(credencialInvalida).toBe(usuarioInexistente);
    expect(senhaErrada).not.toMatch(/não encontrad|não existe|cadastrad/i);
  });

  it("explica conta desativada, que a pessoa não resolve sozinha", () => {
    expect(mensagemDeErroDeAuth(erro("auth/user-disabled"))).toMatch(
      /secretaria/i,
    );
  });

  it("orienta em caso de excesso de tentativas", () => {
    expect(mensagemDeErroDeAuth(erro("auth/too-many-requests"))).toMatch(
      /aguarde/i,
    );
  });

  it("distingue falha de rede de erro de credencial", () => {
    expect(mensagemDeErroDeAuth(erro("auth/network-request-failed"))).toMatch(
      /conexão|internet/i,
    );
  });

  it("explica link expirado de definição de senha", () => {
    expect(mensagemDeErroDeAuth(erro("auth/expired-action-code"))).toMatch(
      /expirou/i,
    );
  });

  it("cai numa mensagem genérica para código desconhecido", () => {
    const mensagem = mensagemDeErroDeAuth(erro("auth/algo-que-nao-mapeamos"));
    expect(mensagem).toMatch(/tente de novo/i);
  });

  it("nunca devolve texto vazio nem o erro cru", () => {
    for (const entrada of [null, undefined, new Error("boom"), {}, "x"]) {
      const mensagem = mensagemDeErroDeAuth(entrada);
      expect(mensagem.length).toBeGreaterThan(0);
      expect(mensagem).not.toMatch(/auth\//);
    }
  });
});
