import { expect, test } from "@playwright/test";

/**
 * Fluxo de acesso, sem sessão.
 *
 * Os cenários com usuário autenticado dependem de contas de teste no
 * Firebase e entram junto com a carga de dados da FASE 3.
 */

test.describe("visitante", () => {
  test("é mandado para o login ao abrir a raiz", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Entrar no Portal" }),
    ).toBeVisible();
    await expect(page.getByAltText("Colégio IBPI")).toBeVisible();
  });

  test("é barrado na área de gestão e volta para o login", async ({ page }) => {
    await page.goto("/gestao/alunos");

    await expect(page).toHaveURL(/\/login\?continuar=/);
    // O destino é guardado para devolver a pessoa ao lugar certo.
    expect(new URL(page.url()).searchParams.get("continuar")).toBe(
      "/gestao/alunos",
    );
  });

  test("é barrado na área de consulta", async ({ page }) => {
    await page.goto("/portal");

    await expect(page).toHaveURL(/\/login\?continuar=%2Fportal/);
  });

  test("nenhuma página é indexável por buscador", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });
});

test.describe("formulário de login", () => {
  test("valida os campos antes de chamar o servidor", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("Informe seu e-mail.")).toBeVisible();
    await expect(page.getByText("Informe sua senha.")).toBeVisible();
  });

  test("valida o formato do e-mail com a nossa mensagem", async ({ page }) => {
    // Se a validação nativa do navegador estivesse ativa, ela bloquearia o
    // envio antes e mostraria o balão padrão, em inglês.
    await page.goto("/login");

    await page.getByLabel("E-mail").fill("alice");
    await page.getByLabel("Senha").fill("uma-senha");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(
      page.getByText("Esse e-mail não parece válido."),
    ).toBeVisible();
  });

  test("leva para a recuperação de senha", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: "Esqueci minha senha" }).click();

    await expect(page).toHaveURL(/\/recuperar-senha$/);
    await expect(
      page.getByRole("heading", { name: "Recuperar senha" }),
    ).toBeVisible();
  });
});

test.describe("definição de senha", () => {
  test("recusa link sem código", async ({ page }) => {
    await page.goto("/definir-senha");

    await expect(page.getByText("Link inválido ou expirado")).toBeVisible();
  });
});

test.describe("rota de sessão", () => {
  test("responde em JSON quando não há sessão, nunca em HTML", async ({
    request,
  }) => {
    // Regressão: o proxy redirecionava a chamada de API para a tela de
    // login, e o cliente quebrava com "token inesperado '<'" ao tentar ler
    // o HTML como JSON.
    const resposta = await request.post("/api/auth/session", {
      data: { idToken: "token-invalido" },
      maxRedirects: 0,
    });

    expect(resposta.status()).toBe(401);
    expect(resposta.headers()["content-type"]).toContain("application/json");
    expect(await resposta.json()).toHaveProperty("erro");
  });

  test("recusa corpo sem token", async ({ request }) => {
    const resposta = await request.post("/api/auth/session", {
      data: {},
      maxRedirects: 0,
    });

    expect(resposta.status()).toBe(400);
    expect(await resposta.json()).toHaveProperty("erro");
  });
});
