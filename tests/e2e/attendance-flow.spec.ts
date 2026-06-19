import { expect, type Locator, type Page, test } from "@playwright/test";
import { INSTRUCTOR_STORAGE_STATE } from "./support/auth";
import { resetE2eFixture } from "./support/database";

const AD_HOC_SESSION_ID = "e2e-class-session-ad-hoc";

test.use({ storageState: INSTRUCTOR_STORAGE_STATE });
test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  resetE2eFixture();
});

test("recurring class supports QR, manual correction, visitor attendance, and ending", async ({
  page,
}) => {
  await page.goto("/schedule");
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(page.getByRole("button", { name: "Hoje" })).toBeVisible();

  await occurrenceButton(page, "E2E No-Gi 19h").click();
  await expect(page.getByText("Recorrente", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Iniciar aula" }).click();

  await expect(page).toHaveURL(/\/classes\//);
  await expect(page.getByRole("heading", { name: "E2E No-Gi 19h" })).toBeVisible();
  await expect(page.getByText("Em andamento")).toBeVisible();
  await expect(page.getByText("QR Code da aula")).toBeVisible();

  const qrCode = page.getByTestId("active-class-qr-code");
  await expect(qrCode).toBeVisible();
  await expect(qrCode).toHaveAttribute("data-qr-url", /\/student\/check-in\?token=/);

  const countdown = page.getByText(/\d+s/).last();
  const initialCountdown = await countdown.textContent();
  await expect(countdown).toBeVisible();
  await page.waitForTimeout(1100);
  await expect(countdown).not.toHaveText(initialCountdown ?? "");

  await expect(page.getByText("0 presentes · 2 da turma")).toBeVisible();

  const anaRow = rosterRow(page, "E2E Ana Presente");
  await anaRow.getByRole("button", { name: "Marcar presença" }).click();
  await expect(anaRow).toContainText("Manual");
  await expect(page.getByText("1 presente · 2 da turma")).toBeVisible();

  await anaRow.getByRole("button", { name: "Invalidar" }).click();
  await page.getByPlaceholder("Motivo da invalidação (obrigatório)...").fill("Correção E2E");
  await anaRow.getByRole("button", { name: "Confirmar" }).click();
  await expect(anaRow).toContainText("Invalidada");
  await expect(anaRow).toContainText("Motivo: Correção E2E");
  await expect(page.getByText("0 presentes · 2 da turma")).toBeVisible();

  await page.getByRole("button", { name: "Encerrar aula" }).click();
  await expect(page.getByText("Encerrada", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltar para agenda" })).toBeVisible();
  await expect(page.getByTestId("active-class-qr-code")).toHaveCount(0);
});

test("ad hoc class shows scheduled state before start and ended state after end", async ({
  page,
}) => {
  await page.goto(`/classes/${AD_HOC_SESSION_ID}`);

  await expect(page.getByRole("heading", { name: "E2E Open Mat Avulsa" })).toBeVisible();
  await expect(page.getByText("Avulsa", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar aula" })).toBeVisible();
  await expect(page.getByTestId("active-class-qr-code")).toHaveCount(0);

  await page.getByRole("button", { name: "Iniciar aula" }).click();
  await expect(page.getByText("Em andamento")).toBeVisible();
  await expect(page.getByTestId("active-class-qr-code")).toBeVisible();

  await page.getByRole("button", { name: "Encerrar aula" }).click();
  await expect(page.getByText("Encerrada", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltar para agenda" })).toBeVisible();
  await expect(page.getByTestId("active-class-qr-code")).toHaveCount(0);
});

test("cancelled recurring occurrence cannot be started", async ({ page }) => {
  await page.goto("/schedule");

  await occurrenceButton(page, "E2E Aula Cancelada").click();
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar aula" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reativar aula" })).toBeVisible();
});

async function addStudentBySearch(page: Page, studentName: string) {
  await page.getByRole("button", { name: "Adicionar aluno" }).click();
  await page.getByPlaceholder("Buscar aluno por nome...").fill(studentName);
  await searchResult(page, studentName).getByRole("button", { name: "Marcar presença" }).click();
}

function occurrenceButton(page: Page, classGroupName: string): Locator {
  return page.getByRole("button", { name: new RegExp(classGroupName) }).first();
}

function rosterRow(page: Page, studentName: string): Locator {
  return page.getByTestId("attendance-roster-row").filter({ hasText: studentName }).first();
}

function searchResult(page: Page, studentName: string): Locator {
  return page.getByTestId("attendance-search-result").filter({ hasText: studentName }).first();
}
