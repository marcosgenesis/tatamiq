import { type Browser, expect, type Page, test } from "@playwright/test";
import { ADMIN_STORAGE_STATE, INSTRUCTOR_CREDENTIALS } from "./support/auth";
import { ensurePlatformFixtures, PLATFORM_FIXTURES, resetE2eFixture } from "./support/database";

test.describe.configure({ mode: "serial" });
test.use({ storageState: ADMIN_STORAGE_STATE });

test.beforeEach(async () => {
  resetE2eFixture();
  await ensurePlatformFixtures();
});

test("platform admin covers dashboard, provision, admins, users, deletion, and support", async ({
  browser,
  page,
}) => {
  const provisionEmail = `platform-provision-${Date.now()}@tatamiq.local`;
  const adminEmail = `platform-admin-${Date.now()}@tatamiq.local`;

  await createSessionForUser(browser, PLATFORM_FIXTURES.bannable.email);

  await page.goto("/platform");
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  await expect(page.getByText("Academias", { exact: true })).toBeVisible();
  await expect(page.getByText("Usuários", { exact: true })).toBeVisible();
  await expect(page.getByText("Administradores", { exact: true })).toBeVisible();
  await expect(page.getByText("Usuários bloqueados", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Academias" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Usuários" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Administradores" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Auditoria" })).toBeVisible();
  await expect(page.getByText("Academias recentes")).toBeVisible();
  await expect(page.getByText("Atividade recente")).toBeVisible();

  await page.getByRole("button", { name: "Provisionar academia" }).click();
  await page.getByPlaceholder("Nome da academia").fill("Academia Provisionada E2E");
  await page.getByPlaceholder("E-mail do dono").fill(provisionEmail);
  await page.getByPlaceholder("Nome do dono (opcional)").fill("Dono Provisionado E2E");
  await page.getByRole("button", { name: "Provisionar" }).click();
  await expect(page.getByText("Link de primeiro acesso", { exact: true })).toBeVisible();

  await page.goto("/platform/administrators");
  await expect(page.getByRole("heading", { name: "Administradores" })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar administrador" }).click();
  await page.getByPlaceholder("E-mail").fill(adminEmail);
  await page.getByPlaceholder("Nome (opcional)").fill("Admin Removível E2E");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Link de primeiro acesso", { exact: true })).toBeVisible();
  const adminRow = page.locator("tbody tr").filter({ hasText: adminEmail }).first();
  await expect(adminRow).toBeVisible();
  await adminRow.getByRole("button", { name: "Remover" }).click();
  await expect(adminRow).toHaveCount(0);

  await page.goto("/platform/academies");
  await expect(page.getByRole("heading", { name: "Academias" })).toBeVisible();
  await page
    .getByPlaceholder("Buscar academia por nome ou slug")
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
  await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();
  await openPlatformUser(page, PLATFORM_FIXTURES.academyOwner.email);
  await expect(page.getByText("Conta", { exact: true })).toBeVisible();
  await expect(page.getByText("Academias (membro)", { exact: true })).toBeVisible();

  await openPlatformUser(page, "aluno@tatamiq.local");
  await expect(page.getByText("Acesso de aluno", { exact: true })).toBeVisible();

  await openPlatformUser(page, PLATFORM_FIXTURES.bannable.email);
  await page.getByRole("button", { name: "Bloquear usuário" }).click();
  await page.getByPlaceholder("Motivo do bloqueio (opcional)").fill("Teste E2E");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Bloqueado")).toBeVisible();
  await page.getByRole("button", { name: "Desbloquear usuário" }).click();
  await expect(page.getByText("Ativo")).toBeVisible();
  await expect(page.getByRole("button", { name: /Revogar sessões \([1-9]/ })).toBeVisible();
  await page.getByRole("button", { name: /Revogar sessões \([1-9]/ }).click();
  await expect(page.getByRole("button", { name: "Revogar sessões (0)" })).toBeDisabled();

  await page.goto("/platform/users");
  await openPlatformUser(page, PLATFORM_FIXTURES.deletePreserve.email);
  await page.getByRole("button", { name: "Excluir usuário" }).click();
  await expect(page.getByText("Vínculos de academia:")).toBeVisible();
  await expect(page.getByText("Acessos de aluno:")).toBeVisible();
  await expect(page.getByText("Sessões ativas:")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(page).toHaveURL(/\/platform\/users$/);
  await expect(
    page.locator("tbody tr").filter({ hasText: PLATFORM_FIXTURES.deletePreserve.email }),
  ).toHaveCount(0);

  await openPlatformUser(page, PLATFORM_FIXTURES.deleteDefinitive.email);
  await page.getByRole("button", { name: "Excluir usuário" }).click();
  await page.locator("select").first().selectOption("definitive");
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(page).toHaveURL(/\/platform\/users$/);
  await expect(
    page.locator("tbody tr").filter({ hasText: PLATFORM_FIXTURES.deleteDefinitive.email }),
  ).toHaveCount(0);

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
  await expect(page.getByRole("heading", { name: "Auditoria" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar log" })).toBeVisible();
  await expect(page.getByText("Ação")).toBeVisible();
  await expect(page.getByText("Responsável")).toBeVisible();
  await expect(page.getByText("Alvo")).toBeVisible();
  await expect(page.getByText("Resultado")).toBeVisible();
  await expect(page.getByText("Quando")).toBeVisible();
});

test("instructor is redirected away from /platform", async ({ browser }) => {
  const context = await browser.newContext({ storageState: INSTRUCTOR_STORAGE_STATE });
  const instructorPage = await context.newPage();
  await instructorPage.goto("/platform");
  await expect(instructorPage).toHaveURL(/\/choose-area$/);
  await expect(instructorPage.getByRole("heading", { name: "Escolha sua área" })).toBeVisible();
  await context.close();
});

async function createSessionForUser(browser: Browser, email: string) {
  const page = await browser.newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill("tatamiq123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/choose-area$/);
  await expect(
    page.getByText("Esta conta ainda não tem academia nem acesso de aluno.", { exact: false }),
  ).toBeVisible();
  await page.close();
}

async function openPlatformUser(page: Page, email: string) {
  await page.goto("/platform/users");
  await page.getByPlaceholder("Buscar usuário por nome ou e-mail").fill(email);
  const row = page.locator("tbody tr").filter({ hasText: email }).first();
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: /Abrir/ }).click();
  await expect(page.getByText(email)).toBeVisible();
}
