import { expect, type Locator, type Page, test } from "@playwright/test";
import { INSTRUCTOR_STORAGE_STATE } from "./support/auth";
import { resetE2eFixture } from "./support/database";

test.describe.configure({ mode: "serial" });
test.use({ storageState: INSTRUCTOR_STORAGE_STATE });

test.beforeEach(() => {
  resetE2eFixture();
});

test("creates a fee, requires reason for adjust/waive, and supports manual payment", async ({
  page,
}) => {
  await openMonthlyFees(page);

  await page.getByRole("button", { name: /Nova mensalidade/ }).click();
  await expect(page.getByRole("heading", { name: "Nova mensalidade" })).toBeVisible();
  await page.getByLabel("Aluno").selectOption({ label: "000 E2E Graduação Recém-matriculado" });
  await page.getByLabel("Mês de referência").selectOption("12");
  await page.getByLabel("Ano de referência").fill("2026");
  await page.getByLabel("Valor (R$)").fill("199,90");
  await page.getByLabel("Dia de vencimento").fill("12");
  await page.getByRole("button", { name: "Criar mensalidade" }).click();

  const createdRow = feeRow(page, "000 E2E Graduação Recém-matriculado", "Dezembro 2026");
  await expect(createdRow).toBeVisible();
  await expect(createdRow).toContainText("Em aberto");

  const openRow = feeRow(page, "E2E Ana Presente", "Julho 2026");
  await openRow.getByRole("button", { name: "Ajustar" }).click();
  await expect(page.getByRole("heading", { name: "Ajustar valor" })).toBeVisible();
  await page.getByLabel("Novo valor (R$)").fill("210,00");
  await expect(page.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  await page.getByLabel("Motivo").fill("Bolsa parcial E2E");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(openRow).toContainText("R$ 210,00");
  await expect(openRow).toContainText("R$ 180,00");
  await expect(openRow).toContainText("Em aberto");

  const waiveRow = feeRow(page, "E2E Ana Presente", "Agosto 2026");
  await waiveRow.getByRole("button", { name: "Dispensar" }).click();
  await expect(page.getByRole("heading", { name: "Dispensar mensalidade" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  await page.getByLabel("Motivo").fill("Cortesia E2E");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(waiveRow).toContainText("Dispensado");

  const manualRow = feeRow(page, "E2E Bruno Visitante", "Julho 2026");
  await manualRow.getByRole("button", { name: "Pagar" }).click();
  await expect(page.getByRole("heading", { name: "Marcar como pago" })).toBeVisible();
  await page.getByLabel("Observação (opcional)").fill("Pago em dinheiro na recepção");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(manualRow).toContainText("Pago");

  const overdueRow = feeRow(page, "E2E Ana Presente", "Maio 2026");
  await expect(overdueRow).toContainText("Atrasada");
});

test("opens the fake R2 receipt and approves a pending receipt", async ({ page }) => {
  await page.goto("/monthly-fees?status=under_review");
  await expect(page.getByRole("heading", { name: "Mensalidades" })).toBeVisible();

  const reviewRow = feeRow(page, "E2E Bruno Visitante", "Agosto 2026");
  await expect(reviewRow).toContainText("Em verificação");
  await reviewRow.getByRole("button", { name: "Revisar" }).click();

  await expect(page.getByRole("heading", { name: "Verificação de pagamento" })).toBeVisible();
  await expect(page.getByText("Comprovante E2E pendente")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rejeitar" })).toBeDisabled();

  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Abrir comprovante" }).click(),
  ]);
  await popup.waitForLoadState();
  await expect(popup).toHaveURL(/__e2e\/r2\/read\?fileKey=/);
  await expect(popup.locator("body")).toContainText("fake-r2:receipts/e2e/review/pending.png");
  await popup.close();

  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/approve") && response.ok()),
    page.getByRole("button", { name: "Aprovar" }).click(),
  ]);
  await expect(page.getByRole("heading", { name: "Verificação de pagamento" })).toHaveCount(0);
  await expect(reviewRow).toHaveCount(0);

  await page.goto("/monthly-fees");
  await expect(page).toHaveURL(/\/monthly-fees$/);
  await page.reload();
  const paidRow = feeRow(page, "E2E Bruno Visitante", "Agosto 2026");
  await expect(paidRow).toBeVisible();
  await expect.poll(async () => await paidRow.textContent()).toContain("Pago");
});

test("rejecting a pending receipt requires a reason and returns the fee to open", async ({
  page,
}) => {
  await page.goto("/monthly-fees?status=under_review");
  await expect(page.getByRole("heading", { name: "Mensalidades" })).toBeVisible();

  const reviewRow = feeRow(page, "E2E Bruno Visitante", "Agosto 2026");
  await reviewRow.getByRole("button", { name: "Revisar" }).click();

  await expect(page.getByRole("button", { name: "Rejeitar" })).toBeDisabled();
  await page.getByLabel("Motivo da rejeição").fill("Comprovante ilegível");
  await expect(page.getByRole("button", { name: "Rejeitar" })).toBeEnabled();
  await page.getByRole("button", { name: "Rejeitar" }).click();

  await expect(page.getByRole("heading", { name: "Verificação de pagamento" })).toHaveCount(0);
  await expect(reviewRow).toHaveCount(0);

  await page.goto("/monthly-fees");
  await expect(page).toHaveURL(/\/monthly-fees$/);
  const reopenedRow = feeRow(page, "E2E Bruno Visitante", "Agosto 2026");
  await expect(reopenedRow).toBeVisible();
  await expect(reopenedRow).toContainText("Em aberto");
});

async function openMonthlyFees(page: Page) {
  await page.goto("/monthly-fees");
  await expect(page.getByRole("heading", { name: "Mensalidades" })).toBeVisible();
}

function feeRow(page: Page, studentName: string, referenceLabel: string): Locator {
  return page
    .getByTestId("monthly-fee-row")
    .filter({ hasText: studentName })
    .filter({ hasText: referenceLabel })
    .first();
}
