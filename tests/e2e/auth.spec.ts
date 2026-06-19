import { expect, test } from "@playwright/test";
import { getLatestPasswordResetToken } from "./support/database";

test.describe.configure({ mode: "serial" });

const signupEmail = `e2e-auth-${Date.now()}@tatamiq.local`;
const initialPassword = "tatamiq123";
const resetPassword = "tatamiq456";
const displayName = "E2E Auth User";
const academyName = "Academia E2E Auth";

test("sign-up flows through onboarding into the instructor panel", async ({ page }) => {
  await page.goto("/sign-up");

  await expect(page.getByRole("heading", { name: "Criar sua conta" })).toBeVisible();
  await page.getByLabel("Nome").fill(displayName);
  await page.getByLabel("Email").fill(signupEmail);
  await page.getByLabel("Senha").fill(initialPassword);
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page).toHaveURL(/\/onboarding\/academy$/);
  await page.getByPlaceholder("Ex: Arte Suave BJJ").fill(academyName);
  await page.getByRole("button", { name: "Continuar" }).click();

  const nextStep = await Promise.race([
    page
      .getByRole("heading", { name: "Painel" })
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => "panel" as const),
    page
      .getByRole("button", { name: "Pular" })
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => "logo" as const),
    page
      .getByRole("button", { name: "Começar a usar" })
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => "details" as const),
  ]);

  if (nextStep === "logo") {
    await page.getByRole("button", { name: "Pular" }).click();
    await page.getByRole("button", { name: "Começar a usar" }).click();
  } else if (nextStep === "details") {
    await page.getByRole("button", { name: "Começar a usar" }).click();
  }

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
});

test("invalid credentials show the expected sign-in error", async ({ page }) => {
  await page.goto("/sign-in");

  await page.getByLabel("Email").fill("nao-existe@tatamiq.local");
  await page.getByLabel("Senha").fill("senha-invalida");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(
    page.getByText("Não foi possível entrar. Confira seus dados e tente novamente."),
  ).toBeVisible();
});

test("sign-out returns to sign-in and sign-in works again", async ({ page }) => {
  await signIn(page, initialPassword);

  await page.getByRole("button", { name: displayName.charAt(0), exact: true }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Entrar no Tatamiq" })).toBeVisible();

  await signIn(page, initialPassword);
});

test("forgot password issues a token and reset password allows a new sign-in", async ({ page }) => {
  await page.goto("/forgot-password");

  await page.getByLabel("Email").fill(signupEmail);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(
    page.getByText("Se o email existir, o link de recuperação será enviado."),
  ).toBeVisible();

  const token = await getLatestPasswordResetToken(signupEmail);
  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel("Nova senha").fill(resetPassword);
  await page.getByRole("button", { name: "Definir senha" }).click();

  await expect(page).toHaveURL(/\/sign-in$/);
  await signIn(page, resetPassword);
});

test("reset password rejects missing and invalid tokens", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page.getByText("Link de recuperação inválido.")).toBeVisible();

  await page.goto("/reset-password?token=token-invalido-e2e");
  await page.getByLabel("Nova senha").fill("qualquer-senha");
  await page.getByRole("button", { name: "Definir senha" }).click();
  await expect(
    page.getByText("Não foi possível definir a nova senha. Solicite um novo link."),
  ).toBeVisible();
});

async function signIn(page: import("@playwright/test").Page, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(signupEmail);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/(choose-area)?$/);

  const instructorAreaButton = page.getByRole("button", { name: "Área do instrutor" });
  if (await instructorAreaButton.isVisible().catch(() => false)) {
    await instructorAreaButton.click();
  }

  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
}
