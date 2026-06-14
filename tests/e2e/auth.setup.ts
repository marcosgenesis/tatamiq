import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test } from "@playwright/test";
import {
  INSTRUCTOR_EMAIL,
  INSTRUCTOR_PASSWORD,
  INSTRUCTOR_STORAGE_STATE_PATH,
} from "./support/auth";

test("create instructor storage state", async ({ page }) => {
  mkdirSync(dirname(INSTRUCTOR_STORAGE_STATE_PATH), { recursive: true });

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(INSTRUCTOR_EMAIL);
  await page.getByLabel("Senha").fill(INSTRUCTOR_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/sign-in/);

  await page.goto("/");
  await expect(page).not.toHaveURL(/\/sign-in/);
  await page.context().storageState({ path: INSTRUCTOR_STORAGE_STATE_PATH });
});
