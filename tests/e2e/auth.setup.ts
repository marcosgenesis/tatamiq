import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { E2E_AUTH_DIR, INSTRUCTOR_CREDENTIALS, INSTRUCTOR_STORAGE_STATE } from "./support/auth";

test("create instructor storage state", async ({ page }) => {
  await mkdir(E2E_AUTH_DIR, { recursive: true });

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(INSTRUCTOR_CREDENTIALS.email);
  await page.getByLabel("Senha").fill(INSTRUCTOR_CREDENTIALS.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/(choose-area)?$/);

  const instructorAreaButton = page.getByRole("button", { name: "Área do instrutor" });
  if (await instructorAreaButton.isVisible().catch(() => false)) {
    await instructorAreaButton.click();
  }

  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
  await page.context().storageState({ path: INSTRUCTOR_STORAGE_STATE });
});
