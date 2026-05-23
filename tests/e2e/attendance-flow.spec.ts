import { expect, type Locator, type Page, test } from "@playwright/test";
import { resetE2eFixture } from "./support/database";

test.describe.configure({ mode: "serial" });

test.beforeEach(() => {
  resetE2eFixture();
});

test("recurring class supports QR, manual correction, visitor attendance, and ending", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();

  const recurringCard = occurrenceCard(page, "E2E No-Gi 19h");
  await expect(recurringCard).toContainText("Recorrente");
  await recurringCard.getByRole("button", { name: "Iniciar aula" }).click();

  await expect(page).toHaveURL(/\/classes\//);
  await expect(page.getByRole("heading", { name: "E2E No-Gi 19h" })).toBeVisible();
  await expect(page.getByText("Em andamento")).toBeVisible();
  await expect(page.getByText("QR Code da aula")).toBeVisible();
  await expect(page.getByTestId("active-class-qr-code")).toBeVisible();
  await expect(page.getByText(/\d+s/).last()).toBeVisible();

  await expect(page.getByText("0 presentes · 1 da turma")).toBeVisible();

  const anaRow = rosterRow(page, "E2E Ana Presente");
  await anaRow.getByRole("button", { name: "Marcar presença" }).click();
  await expect(anaRow).toContainText("Manual");
  await expect(page.getByText("1 presente · 1 da turma")).toBeVisible();

  await anaRow.getByRole("button", { name: "Invalidar" }).click();
  await page.getByPlaceholder("Motivo da invalidação (obrigatório)...").fill("Correção E2E");
  await anaRow.getByRole("button", { name: "Confirmar" }).click();
  await expect(anaRow).toContainText("Invalidada");
  await expect(anaRow).toContainText("Motivo: Correção E2E");
  await expect(page.getByText("0 presentes · 1 da turma")).toBeVisible();

  await addStudentBySearch(page, "E2E Ana Presente");
  await expect(rosterRow(page, "E2E Ana Presente")).toContainText("Manual");
  await expect(page.getByText("1 presente · 1 da turma")).toBeVisible();

  await page.getByRole("button", { name: "Adicionar aluno" }).click();
  await page.getByPlaceholder("Buscar aluno por nome...").fill("Bruno");
  const brunoResult = searchResult(page, "E2E Bruno Visitante");
  await expect(brunoResult).toContainText("Fora da turma");
  await brunoResult.getByRole("button", { name: "Marcar presença" }).click();

  const brunoRow = rosterRow(page, "E2E Bruno Visitante");
  await expect(brunoRow).toContainText("Fora da turma");
  await expect(brunoRow).toContainText("Manual");
  await expect(page.getByText("2 presentes · 1 da turma")).toBeVisible();

  await page.getByRole("button", { name: "Encerrar aula" }).click();
  await expect(page.getByText("Encerrada", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltar para agenda" })).toBeVisible();
});

test("ad hoc class can be started and ended", async ({ page }) => {
  await signIn(page);
  await page.goto("/schedule");

  const adHocCard = occurrenceCard(page, "E2E Open Mat Avulsa");
  await expect(adHocCard).toContainText("Avulsa");
  await adHocCard.getByRole("button", { name: "Iniciar aula" }).click();

  await expect(page).toHaveURL(/\/classes\//);
  await expect(page.getByRole("heading", { name: "E2E Open Mat Avulsa" })).toBeVisible();
  await expect(page.getByText("Avulsa", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Encerrar aula" }).click();
  await expect(page.getByText("Encerrada", { exact: true })).toBeVisible();
});

test("cancelled recurring occurrence cannot be started", async ({ page }) => {
  await signIn(page);
  await page.goto("/schedule");

  const cancelledCard = occurrenceCard(page, "E2E Aula Cancelada");
  await expect(cancelledCard).toContainText("Cancelada");
  await expect(cancelledCard.getByRole("button", { name: "Iniciar aula" })).toHaveCount(0);
  await expect(cancelledCard.getByRole("button", { name: "Reativar" })).toBeVisible();
});

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("dev@tatamiq.local");
  await page.getByLabel("Senha").fill("tatamiq123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
}

async function addStudentBySearch(page: Page, studentName: string) {
  await page.getByRole("button", { name: "Adicionar aluno" }).click();
  await page.getByPlaceholder("Buscar aluno por nome...").fill(studentName);
  await searchResult(page, studentName).getByRole("button", { name: "Marcar presença" }).click();
}

function occurrenceCard(page: Page, classGroupName: string): Locator {
  return page.getByTestId("schedule-occurrence-card").filter({ hasText: classGroupName }).first();
}

function rosterRow(page: Page, studentName: string): Locator {
  return page.getByTestId("attendance-roster-row").filter({ hasText: studentName }).first();
}

function searchResult(page: Page, studentName: string): Locator {
  return page.getByTestId("attendance-search-result").filter({ hasText: studentName }).first();
}
