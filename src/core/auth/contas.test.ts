import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const updateUser = vi.fn();
const getUserByEmail = vi.fn();
const createUser = vi.fn();
const setCustomUserClaims = vi.fn();
const set = vi.fn();

vi.mock("@/core/firebase/admin", () => ({
  getAdminAuth: () => ({
    getUser,
    updateUser,
    getUserByEmail,
    createUser,
    setCustomUserClaims,
  }),
  getAdminDb: () => ({
    collection: () => ({ doc: () => ({ set }) }),
  }),
}));

const { criarOuAtualizarConta, sincronizarEmailDaConta } = await import(
  "@/core/auth/contas"
);

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ email: "antigo@ibpi.com.br" });
  updateUser.mockResolvedValue({});
  setCustomUserClaims.mockResolvedValue(undefined);
  set.mockResolvedValue(undefined);
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

describe("criarOuAtualizarConta", () => {
  it("troca a senha de uma conta que já existe, quando ela é informada", async () => {
    // Sem isto a senha era ignorada em silêncio no caminho de atualização, e
    // quem a informou ficava com uma senha que nunca foi gravada.
    getUserByEmail.mockResolvedValue({ uid: "uid-1" });

    await criarOuAtualizarConta({
      email: "Pessoa@IBPI.com.br",
      nome: "Pessoa",
      role: "professor",
      senha: "SenhaNova123",
    });

    expect(createUser).not.toHaveBeenCalled();
    expect(updateUser).toHaveBeenCalledWith("uid-1", {
      displayName: "Pessoa",
      password: "SenhaNova123",
    });
  });

  it("não mexe na senha quando ela não é informada", async () => {
    // É o caso da secretaria criando o acesso de uma família: ninguém da
    // escola chega a conhecer a senha.
    getUserByEmail.mockResolvedValue({ uid: "uid-1" });

    await criarOuAtualizarConta({
      email: "pessoa@ibpi.com.br",
      nome: "Pessoa",
      role: "responsavel",
    });

    expect(updateUser).toHaveBeenCalledWith("uid-1", { displayName: "Pessoa" });
  });

  it("conta nova nasce com a senha sorteada quando nenhuma é passada", async () => {
    getUserByEmail.mockRejectedValue(
      Object.assign(new Error("nao existe"), { code: "auth/user-not-found" }),
    );
    createUser.mockResolvedValue({ uid: "uid-2" });

    const conta = await criarOuAtualizarConta({
      email: "novo@ibpi.com.br",
      nome: "Novo",
      role: "aluno",
    });

    expect(conta.nova).toBe(true);
    expect(createUser.mock.calls[0][0].password).toBeTruthy();
  });

  it("guarda o e-mail em minúsculas: ele é a identidade da conta", async () => {
    getUserByEmail.mockResolvedValue({ uid: "uid-1" });

    const conta = await criarOuAtualizarConta({
      email: "  Pessoa@IBPI.com.br  ",
      nome: "Pessoa",
      role: "professor",
    });

    expect(conta.email).toBe("pessoa@ibpi.com.br");
  });
});
