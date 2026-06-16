import { type Browser, expect, type Page, test } from "@playwright/test";
import {
  INSTRUCTOR_STORAGE_STATE,
  STUDENT_CREDENTIALS,
  STUDENT_STORAGE_STATE,
} from "./support/auth";
import { markStudentIndicatorsUnseen, resetE2eFixture } from "./support/database";

test.describe.configure({ mode: "serial" });
test.use({ storageState: STUDENT_STORAGE_STATE });

test.beforeEach(async () => {
  resetE2eFixture();
  await markStudentIndicatorsUnseen(STUDENT_CREDENTIALS.email);
});

test("student portal renders home, schedule, attendance, graduation, and blocks instructor panel", async ({
  page,
}) => {
  await page.goto("/student");
  await expect(page.getByText(/^Olá,/)).toBeVisible();
  await expect(page.getByText("Aluno ativo")).toBeVisible();
  await expect(page.getByText("Minhas turmas")).toBeVisible();
  await expect(page.getByText("Próximas aulas")).toBeVisible();

  await page.getByRole("button", { name: "Agenda" }).click();
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
  await expect(page.getByText("Próximos 7 dias")).toBeVisible();

  await page.goto("/student/attendance");
  await expect(page.getByText(/presenças$/)).toBeVisible();
  await expect(page.getByText("Últimas 8 semanas")).toBeVisible();

  await page.goto("/student/graduation");
  await expect(page.getByText("Faixa atual")).toBeVisible();
  await expect(page.getByText("Histórico de promoções")).toBeVisible();

  await page.goto("/students");
  await expect(page).not.toHaveURL(/\/students$/);
  await expect(page.getByRole("heading", { name: "Alunos" })).toHaveCount(0);
});

test("student indicators clear after opening mensalidades", async ({ page }) => {
  await page.goto("/student");
  await expect(page.getByRole("button", { name: "Mensalidades" })).toBeVisible();

  const before = await readStudentIndicators(page);
  expect(before.hasNewFees).toBe(true);

  const markSeenPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/student/indicators/mark-seen") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Mensalidades" }).click();
  await markSeenPromise;

  await expect(page.getByRole("heading", { name: "Mensalidades" })).toBeVisible();
  await expect
    .poll(() => readStudentIndicators(page).then((result) => result.hasNewFees))
    .toBe(false);
});

test("student sends a receipt, updates profile, and can check in with QR", async ({
  browser,
  page,
}) => {
  await page.goto("/student");
  await page.getByRole("button", { name: "Mensalidades" }).click();
  await expect(page.getByRole("heading", { name: "Mensalidades" })).toBeVisible();

  await page.getByRole("button", { name: "Enviar comprovante" }).first().click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "receipt.png",
    mimeType: "image/png",
    buffer: Buffer.from("fake-receipt"),
  });
  await page.getByPlaceholder("Observação para o instrutor (opcional)").fill("Comprovante E2E");
  await page.getByRole("button", { name: "Confirmar envio" }).click();
  await expect(page.getByText("Comprovante em verificação.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver comprovante" })).toBeVisible();

  await page.getByRole("button", { name: "Perfil" }).click();
  await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible();
  await page.getByLabel("Telefone").fill("11977776666");
  await page.getByLabel("E-mail").fill(`student-profile-${Date.now()}@tatamiq.local`);
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Perfil atualizado com sucesso.")).toBeVisible();

  const qrToken = await startClassAndReadQrToken(browser);

  const unauthPage = await browser.newPage();
  await unauthPage.goto(`/student/check-in?token=${encodeURIComponent(qrToken)}`);
  await expect(unauthPage.getByText("Entre para confirmar presença")).toBeVisible();
  await expect(unauthPage.getByRole("button", { name: "Entrar" })).toBeVisible();

  await page.goto(`/student/check-in?token=${encodeURIComponent(qrToken)}`);
  await expect(page.getByText("Confirmando presença...")).toBeVisible();
  await expect(page.getByText("Presença confirmada!")).toBeVisible();
  await expect(page.getByText("Turma")).toBeVisible();
  await expect(page.getByText("Aluno")).toBeVisible();

  await unauthPage.goto("/student/check-in");
  await expect(unauthPage.getByText("QR Code inválido")).toBeVisible();
});

async function readStudentIndicators(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("http://localhost:3100/student/indicators", {
      credentials: "include",
    });
    return (await response.json()) as {
      hasNewFees: boolean;
      hasNewPromotion: boolean;
      hasCancelledClass: boolean;
      hasNewNotes: boolean;
    };
  });
}

async function startClassAndReadQrToken(browser: Browser) {
  const context = await browser.newContext({ storageState: INSTRUCTOR_STORAGE_STATE });
  const page = await context.newPage();
  await page.goto("/schedule");
  await page.getByRole("button", { name: /E2E No-Gi 19h/ }).click();
  await page.getByRole("button", { name: "Iniciar aula" }).click();
  await expect(page).toHaveURL(/\/classes\//);
  const qrUrl = await page.getByTestId("active-class-qr-code").getAttribute("data-qr-url");
  await context.close();
  if (!qrUrl) throw new Error("QR URL not found.");
  const token = new URL(qrUrl).searchParams.get("token");
  if (!token) throw new Error("QR token not found.");
  return token;
}
