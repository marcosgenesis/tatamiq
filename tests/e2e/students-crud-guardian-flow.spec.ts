import { expect, type Locator, type Page, test } from "@playwright/test";
import { INSTRUCTOR_STORAGE_STATE } from "./support/auth";
import { resetE2eFixture } from "./support/database";

test.describe.configure({ mode: "serial" });
test.use({ storageState: INSTRUCTOR_STORAGE_STATE });

test.beforeAll(() => {
  resetE2eFixture();
});

const adultStudentName = "000 E2E Adulto CRUD";
const adultStudentEmail = "adult.crud.e2e@tatamiq.local";
const minorStudentName = "000 E2E Menor CRUD";
const minorStudentEmail = "minor.crud.e2e@tatamiq.local";
const fixtureStudentName = "000 E2E Carla CRUD";

test("create a minor student with guardian and show guardian in the row", async ({ page }) => {
  await openStudentsPage(page);
  await openCreateDrawer(page);

  await expect(page.getByText("Responsável", { exact: true })).toHaveCount(0);

  await fillStudentForm(page, {
    name: minorStudentName,
    birthDate: "14/06/2012",
    enrollmentDate: "10/01/2024",
    phone: "11987654321",
    email: minorStudentEmail,
    monthlyAmountDigits: "19990",
    dueDay: "10",
    beltName: "Cinza",
    degreeName: "2 grau(s)",
  });

  await expect(page.getByText("Responsável", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Salvar aluno" }).click();
  await expect(page.getByText("Informe o nome do responsável.")).toBeVisible();
  await expect(page.getByText("Informe o telefone do responsável.")).toBeVisible();

  await page.getByLabel("Nome do responsável", { exact: true }).fill("Mãe E2E");
  await page.getByLabel("Telefone do responsável", { exact: true }).fill("11999998888");
  await page
    .getByLabel("Email do responsável", { exact: true })
    .fill("guardian.minor.crud.e2e@tatamiq.local");
  await page.getByLabel("Parentesco", { exact: true }).fill("Mãe");
  await page.getByRole("button", { name: "Salvar aluno" }).click();

  const row = studentRow(page, minorStudentName);
  await expect(row).toBeVisible();
  await expect(row).toContainText(ageForBirthDate("2012-06-14"));
  await expect(row).toContainText("11987654321");
  await expect(row).toContainText("Resp.: Mãe E2E");
  await expect(row).toContainText("Ativo");
  await expect(row).toContainText("10/01/2024");
  await expect(row).toContainText("Cinza · 2º");
});

test("create an adult student without guardian section", async ({ page }) => {
  await openStudentsPage(page);
  await openCreateDrawer(page);

  await fillStudentForm(page, {
    name: adultStudentName,
    birthDate: "12/03/1998",
    enrollmentDate: "15/02/2024",
    phone: "",
    email: adultStudentEmail,
    monthlyAmountDigits: "25000",
    dueDay: "05",
    beltName: "Branca",
    degreeName: "1 grau(s)",
  });

  await expect(page.getByText("Responsável", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Salvar aluno" }).click();

  const row = studentRow(page, adultStudentName);
  await expect(row).toBeVisible();
  await expect(row).toContainText(ageForBirthDate("1998-03-12"));
  await expect(row).toContainText("Sem telefone");
  await expect(row).toContainText("Ativo");
  await expect(row).toContainText("15/02/2024");
  await expect(row).toContainText("Branca · 1º");
});

test("edit an existing student", async ({ page }) => {
  await openStudentsPage(page);

  const row = studentRow(page, fixtureStudentName);
  await row.getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { name: "Editar aluno" })).toBeVisible();

  await page.getByLabel("Telefone", { exact: true }).fill("11977776666");
  await page.getByLabel("Nome do responsável", { exact: true }).fill("Responsável Editado E2E");
  await page.getByLabel("Telefone do responsável", { exact: true }).fill("11966665555");
  await page.getByRole("button", { name: "Salvar aluno" }).click();

  await expect(row).toContainText("11977776666");
  await expect(row).toContainText("Resp.: Responsável Editado E2E");
});

test("inactivate and reactivate an existing student via filters", async ({ page }) => {
  await openStudentsPage(page);

  const activeRow = studentRow(page, fixtureStudentName);
  await activeRow.getByRole("button", { name: "Inativar" }).click();
  await expect(studentRow(page, fixtureStudentName)).toHaveCount(0);

  await page.getByRole("button", { name: /Inativos/ }).click();
  const inactiveRow = studentRow(page, fixtureStudentName);
  await expect(inactiveRow).toBeVisible();
  await expect(inactiveRow).toContainText("Inativo");
  await expect(inactiveRow).toContainText("Sem convite para inativo");

  await inactiveRow.getByRole("button", { name: "Reativar" }).click();
  await expect(studentRow(page, fixtureStudentName)).toHaveCount(0);

  await page.getByRole("button", { name: /Ativos/ }).click();
  const reactivatedRow = studentRow(page, fixtureStudentName);
  await expect(reactivatedRow).toBeVisible();
  await expect(reactivatedRow).toContainText("Ativo");
});

async function openStudentsPage(page: Page) {
  await page.goto("/students");
  await expect(page.getByRole("heading", { name: "Alunos" })).toBeVisible();
}

async function openCreateDrawer(page: Page) {
  await page.getByRole("button", { name: "Novo aluno" }).click();
  await expect(page.getByRole("heading", { name: "Novo aluno" })).toBeVisible();
}

async function fillStudentForm(
  page: Page,
  input: {
    name: string;
    birthDate: string;
    enrollmentDate: string;
    phone: string;
    email: string;
    monthlyAmountDigits: string;
    dueDay: string;
    beltName: string;
    degreeName: string;
  },
) {
  await page.getByLabel("Nome").fill(input.name);
  await dateInputs(page).nth(0).fill(input.birthDate);
  await dateInputs(page).nth(1).fill(input.enrollmentDate);

  if (input.phone) {
    await page.getByLabel("Telefone", { exact: true }).fill(input.phone);
  } else {
    await page.getByLabel("Telefone", { exact: true }).fill("");
  }

  await page.getByLabel("Email", { exact: true }).fill(input.email);
  await page.getByLabel("Valor mensal (R$)").fill(input.monthlyAmountDigits);
  await dueDayButton(page, input.dueDay).click();
  await selectFieldOption(page, "Faixa", input.beltName);
  await selectFieldOption(page, "Grau", input.degreeName);
}

function dateInputs(page: Page) {
  return page.locator('input[placeholder="dd/mm/aaaa"]');
}

function dueDayButton(page: Page, day: string) {
  return fieldContainer(page, "Dia de vencimento").getByRole("button", { name: day });
}

async function selectFieldOption(page: Page, label: string, option: string) {
  await fieldContainer(page, label).locator("button").first().click();
  await page.locator('[role="option"]:visible').filter({ hasText: option }).last().click();
}

function fieldContainer(page: Page, label: string): Locator {
  return page.locator("label", { hasText: label }).locator("xpath=..");
}

function studentRow(page: Page, name: string): Locator {
  return page.locator("tbody tr").filter({ hasText: name }).first();
}

function ageForBirthDate(isoDate: string): string {
  const birth = new Date(`${isoDate}T00:00:00.000Z`);
  const today = new Date();
  let age = today.getFullYear() - birth.getUTCFullYear();
  const birthdayPassed =
    today.getMonth() > birth.getUTCMonth() ||
    (today.getMonth() === birth.getUTCMonth() && today.getDate() >= birth.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return `${age} anos`;
}
