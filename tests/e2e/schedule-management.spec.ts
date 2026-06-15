import { expect, type Locator, type Page, test } from "@playwright/test";
import { INSTRUCTOR_STORAGE_STATE } from "./support/auth";
import { resetE2eFixture } from "./support/database";

test.use({ storageState: INSTRUCTOR_STORAGE_STATE });
test.describe.configure({ mode: "serial" });

test.beforeEach(() => {
  resetE2eFixture();
});

test("navigates weeks with previous, next, and today", async ({ page }) => {
  const today = new Date();
  const currentWeekStart = getMondayWeekStart(today);
  const nextWeekStart = addDays(currentWeekStart, 7);
  const previousWeekStart = addDays(currentWeekStart, -7);

  await page.goto("/schedule");
  await expect(page.getByRole("button", { name: "Hoje" })).toBeVisible({ timeout: 15_000 });

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    weekMonthLabel(currentWeekStart),
  );
  await expect(page.getByText(dayHeaderLabel(currentWeekStart), { exact: true })).toBeVisible();
  await expect(occurrenceCard(page, /E2E No-Gi 19h/)).toBeVisible();

  await page.getByRole("button", { name: "‹" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    weekMonthLabel(previousWeekStart),
  );
  await expect(page.getByText(dayHeaderLabel(previousWeekStart), { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "›" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    weekMonthLabel(currentWeekStart),
  );
  await expect(page.getByText(dayHeaderLabel(currentWeekStart), { exact: true })).toBeVisible();
  await expect(occurrenceCard(page, /E2E No-Gi 19h/)).toBeVisible();

  await page.getByRole("button", { name: "›" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(weekMonthLabel(nextWeekStart));
  await expect(page.getByText(dayHeaderLabel(nextWeekStart), { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Hoje" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    weekMonthLabel(currentWeekStart),
  );
  await expect(page.getByText(dayHeaderLabel(currentWeekStart), { exact: true })).toBeVisible();
  await expect(occurrenceCard(page, /E2E No-Gi 19h/)).toBeVisible();
});

test("creates and deletes an ad hoc class", async ({ page }) => {
  await page.goto("/schedule");
  await expect(occurrenceCard(page, /E2E Open Mat Avulsa/)).toBeVisible();

  const existingNames = await occurrenceNames(page, /E2E Open Mat Avulsa/);

  await page.getByRole("button", { name: "Aula avulsa" }).click();
  await expect(page.getByRole("heading", { name: "Nova aula avulsa" })).toBeVisible();

  await page.getByLabel("Turma").selectOption({ label: "E2E Open Mat Avulsa" });
  await page.getByRole("button", { name: "Usar agora" }).click();
  await page.getByLabel("Duração (min)").fill("45");
  await page.getByRole("button", { name: "Salvar aula" }).click();

  const openMatCards = page.getByRole("button", { name: /E2E Open Mat Avulsa/ });
  await expect(openMatCards).toHaveCount(existingNames.length + 1);

  const createdName = (await occurrenceNames(page, /E2E Open Mat Avulsa/)).find(
    (name) => !existingNames.includes(name),
  );
  expect(createdName).toBeTruthy();

  const createdCard = page.getByRole("button", { name: createdName! });
  await createdCard.click();
  await expect(page.getByText("Avulsa", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Excluir aula" }).click();

  await expect(createdCard).toHaveCount(0);
});

test("cancels and reactivates a recurring occurrence", async ({ page }) => {
  await page.goto("/schedule");

  await occurrenceCard(page, /E2E No-Gi 19h/).click();
  await expect(page.getByText("Recorrente", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar aula" }).click();

  await occurrenceCard(page, /E2E No-Gi 19h/).click();
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reativar aula" }).click();

  await occurrenceCard(page, /E2E No-Gi 19h/).click();
  await expect(page.getByText("Recorrente", { exact: true })).toBeVisible();
});

function occurrenceCard(page: Page, name: RegExp | string): Locator {
  return page.getByRole("button", { name }).first();
}

function getMondayWeekStart(date: Date): string {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return value.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function weekMonthLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const end = new Date(`${addDays(weekStart, 6)}T00:00:00.000Z`);
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  if (start.getUTCMonth() === end.getUTCMonth()) {
    const label = fmt.format(start);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  const fmtShort = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
  return `${fmtShort.format(start)} - ${fmt.format(end)}`;
}

function dayHeaderLabel(date: string): string {
  return `seg ${date.slice(-2)}`;
}

async function occurrenceNames(page: Page, name: RegExp | string): Promise<string[]> {
  return page.getByRole("button", { name }).allInnerTexts();
}
