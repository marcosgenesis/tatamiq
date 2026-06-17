import { expect, type Locator, type Page, test } from "@playwright/test";
import { INSTRUCTOR_STORAGE_STATE } from "./support/auth";
import { resetE2eFixture } from "./support/database";

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3100";

test.describe.configure({ mode: "serial" });
test.use({ storageState: INSTRUCTOR_STORAGE_STATE });

test.beforeEach(() => {
  resetE2eFixture();
});

test("updates academy data, Pix config, uploads logo, and edits belt rules", async ({ page }) => {
  await openSettings(page);

  await page.getByLabel("Nome da academia").fill("Academia E2E Configurada");
  await page.getByLabel("Endereço").fill("Rua das Faixas, 123");
  await page.getByLabel("Telefone / WhatsApp").fill("11999990000");
  await page.getByLabel("Instagram").fill("@academia.e2e");
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(page.getByText("Configurações salvas com sucesso.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Nome da academia")).toHaveValue("Academia E2E Configurada");
  await expect(page.getByLabel("Endereço")).toHaveValue("Rua das Faixas, 123");
  await expect(page.getByLabel("Telefone / WhatsApp")).toHaveValue("11999990000");
  await expect(page.getByLabel("Instagram")).toHaveValue("@academia.e2e");

  await choosePixMode(page, "Chave Pix");
  await page.locator("#pix-key-type").click();
  await page.getByRole("option", { name: "Email" }).click();
  await page.getByLabel("Chave Pix").fill("pix-chave@tatamiq.local");
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(page.getByText("Configurações salvas com sucesso.")).toBeVisible();

  await page.reload();
  await choosePixMode(page, "Chave Pix");
  await expect
    .poll(() => page.getByLabel("Chave Pix").inputValue())
    .toBe("pix-chave@tatamiq.local");
  await expect(page.locator("#pix-key-type")).toContainText("email");

  await choosePixMode(page, "Copia e cola");
  await page
    .getByLabel("Código Pix copia e cola")
    .fill("00020126360014BR.GOV.BCB.PIX0114pix-copia-e-cola5204000053039865802BR");
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(page.getByText("Configurações salvas com sucesso.")).toBeVisible();

  await page.reload();
  await choosePixMode(page, "Copia e cola");
  await expect
    .poll(() => page.getByLabel("Código Pix copia e cola").inputValue())
    .toBe("00020126360014BR.GOV.BCB.PIX0114pix-copia-e-cola5204000053039865802BR");

  await choosePixMode(page, "Sem Pix");
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(page.getByText("Configurações salvas com sucesso.")).toBeVisible();

  await page.reload();
  await choosePixMode(page, "Sem Pix");
  await expect(page.getByLabel("Chave Pix")).toHaveCount(0);
  await expect(page.getByLabel("Código Pix copia e cola")).toHaveCount(0);

  const logoBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnS1koAAAAASUVORK5CYII=",
    "base64",
  );
  const uploadUrlResponse = await page.request.post(`${API_URL}/academy/logo/upload-url`);
  expect(uploadUrlResponse.ok()).toBeTruthy();
  const uploadUrlPayload = (await uploadUrlResponse.json()) as {
    uploadUrl: string;
    fileKey: string;
  };
  const uploadResponse = await fetch(uploadUrlPayload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: logoBuffer,
  });
  expect(uploadResponse.ok).toBeTruthy();
  const confirmResponse = await page.request.post(`${API_URL}/academy/logo/confirm`, {
    data: { fileKey: uploadUrlPayload.fileKey },
  });
  expect(confirmResponse.ok()).toBeTruthy();

  await page.reload();
  await expect(page.locator('img[alt="Logo"]')).toHaveAttribute(
    "src",
    /__e2e\/r2\/public\?fileKey=/,
  );

  const whiteBeltCard = beltRuleCard(page, "e2e-adult-white");
  const degreeMonthsInput = whiteBeltCard.getByLabel("Meses p/ grau");
  await degreeMonthsInput.click();
  await degreeMonthsInput.press(`${process.platform === "darwin" ? "Meta" : "Control"}+A`);
  await degreeMonthsInput.fill("7");
  await whiteBeltCard.getByTestId("belt-rule-save-e2e-adult-white").click();
  await expect(page.getByText("Regras salvas com sucesso.")).toBeVisible();

  await page.reload();
  await expect(beltRuleCard(page, "e2e-adult-white").getByLabel("Meses p/ grau")).toHaveValue("7");
});

async function openSettings(page: Page) {
  await page.goto("/settings");
  await expect(page.getByText("Logo da academia")).toBeVisible();
  await expect(page.getByText("Dados da academia")).toBeVisible();
}

async function choosePixMode(page: Page, label: "Sem Pix" | "Chave Pix" | "Copia e cola") {
  const option = page.locator('[data-slot="radio-group"] > div').filter({ hasText: label }).first();
  await option.locator('[data-slot="radio-group-item"]').click();
}

function beltRuleCard(page: Page, slug: string): Locator {
  return page.getByTestId(`belt-rule-card-${slug}`);
}
