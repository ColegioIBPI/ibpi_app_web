import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const updateUser = vi.fn();

vi.mock("@/core/firebase/admin", () => ({
  getAdminAuth: () => ({ getUser, updateUser }),
  getAdminDb: () => ({}),
}));

const { sincronizarEmailDaConta } = await import("@/core/auth/contas");

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ email: "antigo@ibpi.com.br" });
  updateUser.mockResolvedValue({});
});

describe("sincronizarEmailDaConta", () => {
  it("troca o e-mail de login quando o do cadastro muda", () => {
    // O e-mail do cadastro é o login: trocar um sem o outro deixa a família
    // com o endereço novo na ficha e o antigo na tela de entrada.
    return sincronizarEmailDaConta("uid-1", "novo@ibpi.com.br").then(
      (resultado) => {
        expect(resultado).toEqual({ ok: true, mudou: true });
        expect(updateUser).toHaveBeenCalledWith("uid-1", {
          email: "novo@ibpi.com.br",
          emailVerified: false,
        });
      },
    );
  });

  it("não mexe em nada quando o e-mail é o mesmo", async () => {
    const resultado = await sincronizarEmailDaConta(
      "uid-1",
      "antigo@ibpi.com.br",
    );

    expect(resultado).toEqual({ ok: true, mudou: false });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("cadastro sem conta não tem o que sincronizar", async () => {
    expect(await sincronizarEmailDaConta(null, "novo@ibpi.com.br")).toEqual({
      ok: true,
      mudou: false,
    });
    expect(await sincronizarEmailDaConta("uid-1", null)).toEqual({
      ok: true,
      mudou: false,
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("conta apagada não quebra a gravação do cadastro", async () => {
    getUser.mockRejectedValue(new Error("auth/user-not-found"));

    expect(await sincronizarEmailDaConta("uid-1", "novo@ibpi.com.br")).toEqual({
      ok: true,
      mudou: false,
    });
  });

  it("explica quando o e-mail já é login de outra pessoa", async () => {
    updateUser.mockRejectedValue(
      Object.assign(new Error("existe"), { code: "auth/email-already-exists" }),
    );

    const resultado = await sincronizarEmailDaConta(
      "uid-1",
      "ocupado@ibpi.com.br",
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toContain("já é login de outra conta");
  });

  it("devolve erro em vez de lançar, para não perder o cadastro", async () => {
    // Quem chama está no meio de gravar um cadastro; perder o cadastro
    // inteiro por causa do e-mail seria pior que não trocar o login.
    updateUser.mockRejectedValue(new Error("rede caiu"));

    const resultado = await sincronizarEmailDaConta(
      "uid-1",
      "novo@ibpi.com.br",
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toBeTruthy();
  });
});
