import { expect, test } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://localhost:3100";

test("API health endpoint responds", async ({ request }) => {
  const healthResponse = await request.get(`${apiUrl}/health`);
  await expect(healthResponse).toBeOK();
  await expect(await healthResponse.json()).toMatchObject({ status: "ok" });
});

test("web app redirects unauthenticated users to sign in", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Entrar no Tatamiq" })).toBeVisible();
  await expect(page.getByText("Tatamiq").first()).toBeVisible();
});
