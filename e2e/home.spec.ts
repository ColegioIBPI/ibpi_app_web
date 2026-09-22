import { expect, test } from "@playwright/test";

test.describe("página inicial", () => {
  test("carrega com a identidade do colégio", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Portal IBPI" }),
    ).toBeVisible();
    await expect(page.getByAltText("Colégio IBPI")).toBeVisible();
  });

  test("não é indexável por buscador", async ({ page }) => {
    // O sistema é área restrita: nenhuma página deve aparecer no Google.
    await page.goto("/");

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });
});
