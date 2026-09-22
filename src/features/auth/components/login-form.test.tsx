import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/features/auth/components/login-form";

const replace = vi.fn();
const refresh = vi.fn();
const entrar = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("@/features/auth/services/auth-client", () => ({
  entrar: (...args: unknown[]) => entrar(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function preencherEEnviar(email: string, senha: string) {
  await userEvent.type(screen.getByLabelText("E-mail"), email);
  await userEvent.type(screen.getByLabelText("Senha"), senha);
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginForm", () => {
  it("valida os campos antes de chamar o Firebase", async () => {
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Informe seu e-mail.")).toBeInTheDocument();
    expect(screen.getByText("Informe sua senha.")).toBeInTheDocument();
    expect(entrar).not.toHaveBeenCalled();
  });

  it("recusa e-mail mal formado", async () => {
    render(<LoginForm />);

    await preencherEEnviar("alice", "12345678");

    expect(
      await screen.findByText("Esse e-mail não parece válido."),
    ).toBeInTheDocument();
    expect(entrar).not.toHaveBeenCalled();
  });

  it("entra e vai para a rota do perfil", async () => {
    entrar.mockResolvedValue("/gestao");
    render(<LoginForm />);

    await preencherEEnviar("secretaria@ibpi.com.br", "senha-correta");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/gestao"));
    expect(entrar).toHaveBeenCalledWith(
      "secretaria@ibpi.com.br",
      "senha-correta",
    );
    // Sem o refresh, a tela seguinte pode vir do cache do cliente ainda como
    // visitante.
    expect(refresh).toHaveBeenCalled();
  });

  it("volta para a rota que a pessoa tentou abrir", async () => {
    entrar.mockResolvedValue("/gestao");
    render(<LoginForm continuar="/gestao/alunos" />);

    await preencherEEnviar("secretaria@ibpi.com.br", "senha-correta");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/gestao/alunos"));
  });

  it("ignora destino externo e usa a rota do perfil", async () => {
    // Proteção contra transformar o login num redirecionador para fora.
    entrar.mockResolvedValue("/portal");
    render(<LoginForm continuar="https://site-falso.example" />);

    await preencherEEnviar("aluno@ibpi.com.br", "senha-correta");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/portal"));
  });

  it("mostra mensagem genérica quando a credencial está errada", async () => {
    entrar.mockRejectedValue({ code: "auth/invalid-credential" });
    render(<LoginForm />);

    await preencherEEnviar("alice@ibpi.com.br", "senha-errada");

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(/e-mail ou senha incorretos/i);
    expect(replace).not.toHaveBeenCalled();
  });

  it("mostra a mensagem do servidor quando a conta não está liberada", async () => {
    entrar.mockRejectedValue(
      new Error("Sua conta ainda não está liberada no sistema."),
    );
    render(<LoginForm />);

    await preencherEEnviar("novo@ibpi.com.br", "senha-correta");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /não está liberada/i,
    );
  });

  it("desabilita o botão enquanto envia", async () => {
    let liberar: (rota: string) => void = () => {};
    entrar.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          liberar = resolve;
        }),
    );
    render(<LoginForm />);

    await preencherEEnviar("alice@ibpi.com.br", "senha-correta");

    const botao = screen.getByRole("button", { name: /carregando/i });
    expect(botao).toBeDisabled();

    liberar("/portal");
    await waitFor(() => expect(replace).toHaveBeenCalled());
  });
});
