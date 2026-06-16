import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  ADMIN_CREDENTIALS,
  ADMIN_STORAGE_STATE,
  E2E_AUTH_DIR,
  INSTRUCTOR_CREDENTIALS,
  INSTRUCTOR_STORAGE_STATE,
  STUDENT_CREDENTIALS,
  STUDENT_STORAGE_STATE,
} from "./support/auth";

test("create instructor storage state", async ({ page }) => {
  await mkdir(E2E_AUTH_DIR, { recursive: true });
  await signIn(page, INSTRUCTOR_CREDENTIALS);

  const instructorAreaButton = page.getByRole("button", { name: "Área do instrutor" });
  if (await instructorAreaButton.isVisible().catch(() => false)) {
    await instructorAreaButton.click();
  }

  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
  await page.context().storageState({ path: INSTRUCTOR_STORAGE_STATE });
});

test("create admin storage state", async ({ page }) => {
  await mkdir(E2E_AUTH_DIR, { recursive: true });
  await signIn(page, ADMIN_CREDENTIALS);
  await expect(page).toHaveURL(/\/platform$/);
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});

test("create student storage state", async ({ page }) => {
  await mkdir(E2E_AUTH_DIR, { recursive: true });
  await signIn(page, STUDENT_CREDENTIALS);

  const studentAreaButton = page.getByRole("button", { name: "Área do aluno" });
  if (await studentAreaButton.isVisible().catch(() => false)) {
    await studentAreaButton.click();
  }

  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByText(/^Olá,/)).toBeVisible();
  await page.context().storageState({ path: STUDENT_STORAGE_STATE });
});

async function signIn(
  page: import("@playwright/test").Page,
  credentials: { email: string; password: string },
) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Senha").fill(credentials.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/(choose-area|platform)?$/);
}
