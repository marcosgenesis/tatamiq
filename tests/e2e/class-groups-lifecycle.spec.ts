import { expect, type Locator, type Page, test } from "@playwright/test";
import { INSTRUCTOR_STORAGE_STATE } from "./support/auth";
import { resetE2eFixture } from "./support/database";

test.describe.configure({ mode: "serial" });
test.use({ storageState: INSTRUCTOR_STORAGE_STATE });

test.beforeEach(() => {
  resetE2eFixture();
});

const createdGroupName = "000 E2E Turma Lifecycle";
const editedGroupName = "000 E2E Turma Lifecycle Editada";
const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
const weekdaysShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

test("create, edit, archive, and reactivate a class group", async ({ page }) => {
  const todayWeekday = weekdayForToday();
  const todayWeekdayShort = weekdaysShort[todayWeekday];

  await openClassGroupsPage(page);
  await page.getByRole("button", { name: "Nova turma" }).click();
  await expect(page.getByRole("heading", { name: "Nova turma" })).toBeVisible();

  await page.getByLabel("Nome da turma").fill(createdGroupName);
  await page.getByLabel("Duração em minutos").fill("75");
  await addTag(page, "No Gi");
  await addTag(page, "Iniciante");
  await setWeeklySchedule(page, 0, weekdays[todayWeekday], "19:15");
  await page.getByRole("button", { name: "Salvar turma" }).click();

  const createdCard = classGroupCard(page, createdGroupName);
  await expect(createdCard).toBeVisible();
  await expect(createdCard).toContainText("Ativa");
  await expect(createdCard).toContainText("No Gi");
  await expect(createdCard).toContainText("Iniciante");
  await expect(createdCard).toContainText(`${todayWeekdayShort} 19:15`);
  await expect(createdCard).toContainText("75 min");

  await openClassGroupActions(createdCard);
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { name: "Editar turma" })).toBeVisible();

  await page.getByLabel("Nome da turma").fill(editedGroupName);
  await page.getByLabel("Duração em minutos").fill("90");
  await page.getByRole("button", { name: "Salvar turma" }).click();

  const editedCard = classGroupCard(page, editedGroupName);
  await expect(editedCard).toBeVisible();
  await expect(editedCard).toContainText("Ativa");
  await expect(editedCard).toContainText("19:15");
  await expect(editedCard).toContainText("90 min");

  await openClassGroupActions(editedCard);
  await page.getByRole("menuitem", { name: "Arquivar" }).click();
  await expect(page.getByRole("heading", { name: "Arquivar turma" })).toBeVisible();
  await page.getByRole("button", { name: /^Arquivar$/ }).click();

  await expect(classGroupCard(page, editedGroupName)).toHaveCount(0);
  await page.getByRole("tab", { name: /Arquivadas/ }).click();

  const archivedCard = classGroupCard(page, editedGroupName);
  await expect(archivedCard).toBeVisible();
  await expect(archivedCard).toContainText("Arquivada");

  await openClassGroupActions(archivedCard);
  await page.getByRole("menuitem", { name: "Reativar" }).click();
  await expect(classGroupCard(page, editedGroupName)).toHaveCount(0);

  await page.getByRole("tab", { name: /Ativas/ }).click();
  const reactivatedCard = classGroupCard(page, editedGroupName);
  await expect(reactivatedCard).toBeVisible();
  await expect(reactivatedCard).toContainText("Ativa");
  await expect(reactivatedCard).toContainText("90 min");
});

test("archived class group disappears from the schedule", async ({ page }) => {
  const scheduleOnlyGroupName = "000 E2E Turma Agenda Arquivada";
  const todayWeekday = weekdayForToday();

  await openClassGroupsPage(page);
  await page.getByRole("button", { name: "Nova turma" }).click();
  await page.getByLabel("Nome da turma").fill(scheduleOnlyGroupName);
  await page.getByLabel("Duração em minutos").fill("60");
  await setWeeklySchedule(page, 0, weekdays[todayWeekday], "19:15");
  await page.getByRole("button", { name: "Salvar turma" }).click();

  await page.goto("/schedule");
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(page.getByRole("button", { name: "Hoje" })).toBeVisible();
  await expect(scheduleOccurrence(page, scheduleOnlyGroupName)).toBeVisible();

  await openClassGroupsPage(page);
  const createdCard = classGroupCard(page, scheduleOnlyGroupName);
  await expect(createdCard).toBeVisible();
  await openClassGroupActions(createdCard);
  await page.getByRole("menuitem", { name: "Arquivar" }).click();
  await page.getByRole("button", { name: /^Arquivar$/ }).click();
  await expect(classGroupCard(page, scheduleOnlyGroupName)).toHaveCount(0);

  await page.goto("/schedule");
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(page.getByRole("button", { name: "Hoje" })).toBeVisible();
  await expect(scheduleOccurrence(page, scheduleOnlyGroupName)).toHaveCount(0);
});

async function openClassGroupsPage(page: Page) {
  await page.goto("/class-groups");
  await expect(page.getByRole("heading", { name: "Turmas" })).toBeVisible();
}

function classGroupCard(page: Page, name: string): Locator {
  return page.locator("button", { has: page.getByRole("heading", { name }) }).first();
}

async function openClassGroupActions(card: Locator) {
  await card.getByLabel("Ações da turma").click();
}

async function addTag(page: Page, value: string) {
  const combobox = page.getByRole("combobox", { name: "Etiquetas" });
  const search = page.getByPlaceholder("Buscar etiqueta...");

  if (!(await search.isVisible().catch(() => false))) {
    await combobox.click();
  }

  await search.fill(value);
  await page.getByRole("option", { name: new RegExp(value) }).click();
}

async function setWeeklySchedule(page: Page, index: number, weekday: string, time: string) {
  const row = page.getByRole("group", { name: `Horário ${index + 1}` });
  const [hour, minute] = time.split(":");

  await row.getByRole("combobox", { name: "Dia da semana" }).click();
  await page.getByRole("option", { name: weekday }).click();
  await row.getByRole("spinbutton", { name: "hour" }).fill(hour ?? "00");
  await row.getByRole("spinbutton", { name: "minute" }).fill(minute ?? "00");
}

function scheduleOccurrence(page: Page, classGroupName: string): Locator {
  return page.getByRole("button", { name: new RegExp(classGroupName) }).first();
}

function weekdayForToday() {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`).getUTCDay();
}
