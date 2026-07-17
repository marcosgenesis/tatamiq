import { expect, type Page, test } from "@playwright/test";
import { ADMIN_STORAGE_STATE, INSTRUCTOR_STORAGE_STATE } from "./support/auth";
import { ensurePlatformFixtures, PLATFORM_FIXTURES, resetE2eFixture } from "./support/database";

test.describe.configure({ mode: "serial" });
test.use({ storageState: ADMIN_STORAGE_STATE });

test.beforeEach(async () => {
  resetE2eFixture();
  await ensurePlatformFixtures();
});

test("platform admin covers dashboard, provision, admins, users, deletion, and support", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const provisionEmail = `platform-provision-${Date.now()}@tatamiq.local`;
  const adminEmail = `platform-admin-${Date.now()}@tatamiq.local`;

  await page.goto("/platform");
  await expect(page.getByRole("main").getByText("Visão geral")).toBeVisible();
  await expect(page.getByRole("link", { name: "Academias" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Usuários" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Administradores" })).toBeVisible();
  await expect(
    page.getByRole("main").getByText("Usuários bloqueados", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Auditoria" }).first()).toBeVisible();
  await expect(page.getByText("Academias recentes")).toBeVisible();
  await expect(page.getByText("Atividade recente")).toBeVisible();

  await page.getByRole("button", { name: "Provisionar academia" }).click();
  await page.getByPlaceholder("Nome da academia").fill("Academia Provisionada E2E");
  await page.getByPlaceholder("E-mail do dono").fill(provisionEmail);
  await page.getByPlaceholder("Nome do dono (opcional)").fill("Dono Provisionado E2E");
  await page.getByRole("button", { name: "Provisionar" }).click();

  await page.goto("/platform/administrators");
  await expect(page.getByRole("button", { name: "Adicionar administrador" })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar administrador" }).click();
  await page.getByPlaceholder("E-mail").fill(adminEmail);
  await page.getByPlaceholder("Nome (opcional)").fill("Admin Removível E2E");
  await page.getByRole("button", { name: "Adicionar" }).click();

  await page.goto("/platform/academies");
  await expect(
    page.getByPlaceholder("Buscar academia por nome, slug ou responsável"),
  ).toBeVisible();
  await page
    .getByPlaceholder("Buscar academia por nome, slug ou responsável")
    .fill(PLATFORM_FIXTURES.academyOwner.academyName);
  const academyRow = page
    .locator("tbody tr")
    .filter({ hasText: PLATFORM_FIXTURES.academyOwner.academyName })
    .first();
  await expect(academyRow).toBeVisible();
  await academyRow
    .getByRole("link", { name: new RegExp(`Abrir ${PLATFORM_FIXTURES.academyOwner.academyName}`) })
    .click();
  await expect(
    page.getByRole("heading", { name: PLATFORM_FIXTURES.academyOwner.academyName }),
  ).toBeVisible();
  await expect(page.getByText("Alunos ativos")).toBeVisible();
  await expect(page.getByText("Turmas ativas")).toBeVisible();
  await expect(page.getByText("Presenças válidas")).toBeVisible();
  await expect(page.getByText("Mensalidades pagas")).toBeVisible();

  await page.goto("/platform/users");
  await expect(page.getByPlaceholder("Buscar usuário por nome ou e-mail")).toBeVisible();
  await openPlatformUser(page, PLATFORM_FIXTURES.academyOwner.email);
  await expect(page.getByText("Conta", { exact: true })).toBeVisible();
  await expect(page.getByText("Academias (membro)", { exact: true })).toBeVisible();

  await openPlatformUser(page, "aluno@tatamiq.local");
  await expect(page.getByText("Acesso de aluno", { exact: true })).toBeVisible();

  await openPlatformUser(page, PLATFORM_FIXTURES.bannable.email);
  await expect(page.getByText("Ativo")).toBeVisible();

  await page.goto("/platform/users");
  await openPlatformUser(page, PLATFORM_FIXTURES.deletePreserve.email);
  await page.getByRole("button", { name: "Excluir usuário" }).click();
  await expect(page.getByText("Vínculos de academia:")).toBeVisible();
  await expect(page.getByText("Acessos de aluno:")).toBeVisible();
  await expect(page.getByText("Sessões ativas:")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await page.goto("/platform/users");
  await expect(
    page.locator("tbody tr").filter({ hasText: PLATFORM_FIXTURES.deletePreserve.email }),
  ).toHaveCount(0);

  await openPlatformUser(page, PLATFORM_FIXTURES.deleteDefinitive.email);
  await page.getByRole("button", { name: "Excluir usuário" }).click();
  await page.locator("select").first().selectOption("definitive");
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await page.goto("/platform/users");
  await expect(
    page.locator("tbody tr").filter({ hasText: PLATFORM_FIXTURES.deleteDefinitive.email }),
  ).toHaveCount(0);

  await openPlatformUser(page, PLATFORM_FIXTURES.deleteMultiResponsible.email);
  await page.getByRole("button", { name: "Excluir usuário" }).click();
  await expect(page.getByText("Responsável de 1 academia(s).")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await page.goto("/platform/users");
  await expect(
    page.locator("tbody tr").filter({ hasText: PLATFORM_FIXTURES.deleteMultiResponsible.email }),
  ).toHaveCount(0);
  await openPlatformAcademy(page, PLATFORM_FIXTURES.deleteMultiResponsible.academyName);
  await expect(
    page.getByText(PLATFORM_FIXTURES.deleteMultiResponsible.remainingEmail),
  ).toBeVisible();
  await expect(page.getByText(PLATFORM_FIXTURES.deleteMultiResponsible.email)).toHaveCount(0);

  await openPlatformUser(page, PLATFORM_FIXTURES.deleteSoleResponsible.email);
  await page.getByRole("button", { name: "Excluir usuário" }).click();
  const confirmDeletion = page.getByRole("button", { name: "Confirmar exclusão" });
  await expect(confirmDeletion).toBeDisabled();
  await page.locator("select").nth(1).selectOption("keep_ownerless");
  await expect(confirmDeletion).toBeDisabled();
  await page.getByLabel("Confirmo que a academia ficará sem responsável.").check();
  await expect(confirmDeletion).toBeEnabled();
  await confirmDeletion.click();
  await openPlatformAcademy(page, PLATFORM_FIXTURES.deleteSoleResponsible.academyName);
  await expect(page.getByText("Sem responsável")).toBeVisible();

  await openPlatformUser(page, "marcosgenesisof@gmail.com");
  await expect(page.getByRole("button", { name: "Iniciar suporte" })).toBeDisabled();

  await openPlatformUser(page, PLATFORM_FIXTURES.academyOwner.email);
  await page.getByPlaceholder("Motivo do suporte (opcional)").fill("Diagnóstico E2E");
  await page.getByRole("button", { name: "Iniciar suporte" }).click();
  await expect(page.getByText("Suporte Assistido ativo")).toBeVisible();
  await expect(page.getByText("Você está operando como cliente", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Encerrar suporte" }).click();
  await expect(page).toHaveURL(/\/platform$/);

  await page.goto("/platform/audit");
  await expect(page.getByRole("button", { name: "Exportar log" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Ação" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Responsável" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Alvo" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Resultado" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Quando" })).toBeVisible();
});

test("instructor is redirected away from /platform", async ({ browser }) => {
  const context = await browser.newContext({ storageState: INSTRUCTOR_STORAGE_STATE });
  const instructorPage = await context.newPage();
  await instructorPage.goto("/platform");

  await expect(instructorPage).not.toHaveURL(/\/platform$/);
  await expect(instructorPage.getByRole("heading", { name: "Painel" })).toBeVisible();

  await context.close();
});

async function openPlatformUser(page: Page, email: string) {
  await page.goto("/platform/users");
  await page.getByPlaceholder("Buscar usuário por nome ou e-mail").fill(email);
  const row = page.locator("tbody tr").filter({ hasText: email }).first();
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: /Abrir/ }).click();
  await expect(page.getByText(email)).toBeVisible();
}

async function openPlatformAcademy(page: Page, academyName: string) {
  await page.goto("/platform/academies");
  await page.getByPlaceholder("Buscar academia por nome, slug ou responsável").fill(academyName);
  const row = page.locator("tbody tr").filter({ hasText: academyName }).first();
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: new RegExp(`Abrir ${academyName}`) }).click();
  await expect(page.getByRole("heading", { name: academyName })).toBeVisible();
}
