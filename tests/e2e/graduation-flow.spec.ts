import { expect, type Locator, type Page, test } from "@playwright/test";
import { INSTRUCTOR_STORAGE_STATE } from "./support/auth";
import { resetE2eFixture } from "./support/database";

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3100";
const DEGREE_ELIGIBLE_STUDENT_ID = "e2e-student-degree-eligible";
const DEGREE_ELIGIBLE_STUDENT_NAME = "000 E2E Graduação Elegível";
const FRESH_STUDENT_NAME = "000 E2E Graduação Recém-matriculado";

test.describe.configure({ mode: "serial" });
test.use({ storageState: INSTRUCTOR_STORAGE_STATE });

test.beforeEach(() => {
  resetE2eFixture();
});

test("promotes a degree-eligible student and records promotion history", async ({ page }) => {
  await openGraduationPage(page);

  const row = eligibleStudentRow(page, DEGREE_ELIGIBLE_STUDENT_NAME);
  await expect(row).toBeVisible();
  await expect(row).toContainText("Grau");
  await expect(row).toContainText("7/6 meses");
  await expect(row).toContainText("31/30 presenças");
  await expect(page.getByText(FRESH_STUDENT_NAME)).toHaveCount(0);

  await row.getByRole("button", { name: "Promover" }).click();
  await expect(
    page.getByRole("heading", { name: `Promover ${DEGREE_ELIGIBLE_STUDENT_NAME}` }),
  ).toBeVisible();

  await expect(page.getByLabel("Novo grau")).toHaveValue("1");
  await page.getByRole("button", { name: "Confirmar promoção" }).click();

  await expect(eligibleStudentRow(page, DEGREE_ELIGIBLE_STUDENT_NAME)).toHaveCount(0);
  await expect(page.getByText("Nenhum aluno elegível")).toBeVisible();

  const promotions = await page.request.get(
    `${API_URL}/students/${DEGREE_ELIGIBLE_STUDENT_ID}/promotions`,
  );
  expect(promotions.ok()).toBeTruthy();
  const promotionPayload = (await promotions.json()) as {
    promotions: Array<{ newDegree: number; newBeltName: string; previousDegree: number }>;
  };
  expect(promotionPayload.promotions[0]?.newDegree).toBe(1);
  expect(promotionPayload.promotions[0]?.newBeltName).toBe("Branca");
  expect(promotionPayload.promotions[0]?.previousDegree).toBe(0);

  await page.goto("/students");
  await expect(studentRow(page, DEGREE_ELIGIBLE_STUDENT_NAME)).toContainText("Branca · 1º");
});

test("dismisses eligibility and removes the student from the list", async ({ page }) => {
  await openGraduationPage(page);

  const row = eligibleStudentRow(page, DEGREE_ELIGIBLE_STUDENT_NAME);
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Adiar" }).click();
  await expect(
    page.getByRole("heading", { name: `Adiar elegibilidade de ${DEGREE_ELIGIBLE_STUDENT_NAME}` }),
  ).toBeVisible();
  await page.getByLabel("Motivo (opcional)").fill("Aguardar avaliação do instrutor");
  await page.getByLabel("Adiar por quantos dias? (opcional)").fill("15");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes(`/students/${DEGREE_ELIGIBLE_STUDENT_ID}/dismiss-eligibility`) &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Confirmar" }).click(),
  ]);

  await page.goto("/graduation");
  await expect(eligibleStudentRow(page, DEGREE_ELIGIBLE_STUDENT_NAME)).toHaveCount(0);
  await expect(page.getByText("Nenhum aluno elegível")).toBeVisible();
});

async function openGraduationPage(page: Page) {
  await page.goto("/graduation");
  await expect(page.getByRole("heading", { name: "Graduação" })).toBeVisible();
}

function eligibleStudentRow(page: Page, studentName: string): Locator {
  return page
    .getByText(studentName, { exact: true })
    .locator("xpath=ancestor::div[.//button[normalize-space()='Promover']][1]");
}

function studentRow(page: Page, studentName: string): Locator {
  return page.locator("tbody tr").filter({ hasText: studentName }).first();
}
