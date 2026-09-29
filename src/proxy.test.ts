import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { SESSION_COOKIE } from "@/core/auth/cookie";
import { proxy } from "@/proxy";

/**
 * O proxy não decide segurança — a autorização real acontece nos layouts.
 * A exceção é o bloqueio de preview, que é barreira de acesso de verdade:
 * a Vercel publica toda branch numa URL pública, e existe um projeto
 * Firebase só.
 */

const pedir = (caminho: string, comSessao = false) => {
  const request = new NextRequest(`https://portal.exemplo/${caminho.slice(1)}`);
  if (comSessao) request.cookies.set(SESSION_COOKIE, "qualquer");
  return request;
};

const ambiente = { ...process.env };

afterEach(() => {
  process.env = { ...ambiente };
});

describe("bloqueio de preview", () => {
  it("preview não atende, nem para quem tem sessão", () => {
    // O cadastro real de 73 alunos menores de idade não sai numa URL que
    // ninguém controla.
    process.env.VERCEL_ENV = "preview";

    for (const caminho of ["/", "/login", "/gestao/alunos"]) {
      expect(proxy(pedir(caminho, true))?.status).toBe(404);
    }
  });

  it("preview também não serve as rotas de API", () => {
    // A planilha de alunos sai por `/api/exportacoes`, que fica de fora do
    // proxy no fluxo normal. Aqui ela precisa entrar.
    process.env.VERCEL_ENV = "preview";

    expect(proxy(pedir("/api/exportacoes/alunos", true))?.status).toBe(404);
  });

  it("responde 404, e não 403 — um 'proibido' confirma que há Portal ali", () => {
    process.env.VERCEL_ENV = "preview";
    expect(proxy(pedir("/"))?.status).not.toBe(403);
  });

  it("abre quando a preview é liberada de propósito", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.PERMITIR_PREVIEW = "1";

    expect(proxy(pedir("/gestao/alunos", true))?.status).not.toBe(404);
  });

  it("produção atende normalmente", () => {
    process.env.VERCEL_ENV = "production";
    expect(proxy(pedir("/gestao/alunos", true))?.status).not.toBe(404);
  });

  it("fora da Vercel — desenvolvimento local — atende normalmente", () => {
    delete process.env.VERCEL_ENV;
    expect(proxy(pedir("/gestao/alunos", true))?.status).not.toBe(404);
  });
});

describe("primeira barreira de sessão", () => {
  it("sem cookie, manda para o login guardando o destino", () => {
    const resposta = proxy(pedir("/gestao/alunos"));
    const destino = new URL(resposta!.headers.get("location")!);

    expect(destino.pathname).toBe("/login");
    expect(destino.searchParams.get("continuar")).toBe("/gestao/alunos");
  });

  it("com cookie, tira a pessoa da tela de login", () => {
    const resposta = proxy(pedir("/login", true));
    expect(new URL(resposta!.headers.get("location")!).pathname).toBe("/");
  });

  it("não redireciona rota de API — ela responde em JSON, inclusive ao negar", () => {
    // Redirecionar devolveria HTML com status 200, e o `fetch` do cliente
    // quebraria ao lê-lo como JSON, com um erro sem relação com a causa.
    const resposta = proxy(pedir("/api/exportacoes/alunos"));
    expect(resposta?.headers.get("location")).toBeNull();
  });

  it("a tela de login abre para quem não tem sessão", () => {
    expect(proxy(pedir("/login"))?.headers.get("location")).toBeNull();
  });
});
