import { type Browser, expect, type Locator, type Page, test } from "@playwright/test";
import { INSTRUCTOR_STORAGE_STATE } from "./support/auth";
import {
  consumeLatestFirstAccess,
  expireInvite,
  expireLatestFirstAccess,
  resetE2eFixture,
} from "./support/database";

test.describe.configure({ mode: "serial" });
test.use({ storageState: INSTRUCTOR_STORAGE_STATE });

test.beforeEach(() => {
  resetE2eFixture();
});

test("pre-registration link lifecycle, approval, first access, and token guards", async ({
  browser,
  page,
}) => {
  const requestEmail = `pre-reg-${Date.now()}@tatamiq.local`;
  const expiredEmail = `pre-reg-expired-${Date.now()}@tatamiq.local`;
  const password = "tatamiq456";

  await openPreRegistrations(page);

  const initialLink = await currentPreRegistrationLink(page);
  await page.getByRole("button", { name: "Pausar" }).click();
  await expect(page.getByText("Pausado", { exact: true })).toBeVisible();

  const publicPage = await browser.newPage();
  await publicPage.goto(initialLink);
  await expect(publicPage.getByText("está pausado", { exact: false })).toBeVisible();
  await expect(publicPage.getByRole("button", { name: "Enviar solicitação" })).toHaveCount(0);

  await page.getByRole("button", { name: "Reativar" }).click();
  await expect(page.getByText("Ativo", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Regenerar/ }).click();
  await expect.poll(() => currentPreRegistrationLink(page)).not.toBe(initialLink);
  const activeLink = await currentPreRegistrationLink(page);

  await publicPage.goto(activeLink);
  await expect(publicPage.getByRole("heading", { name: /Pré-cadastro —/ })).toBeVisible();
  await fillPreRegistrationForm(publicPage, {
    name: "Aluno Pré Cadastro E2E",
    birthDate: "2012-06-14",
    phone: "11987654321",
    email: requestEmail,
    guardianName: "Mãe Pré Cadastro",
    guardianPhone: "11999998888",
    note: "Observação E2E",
  });
  await publicPage.getByRole("button", { name: "Enviar solicitação" }).click();
  await expect(publicPage.getByText("Solicitação enviada")).toBeVisible();

  const requestCard = preRegistrationCard(page, requestEmail);
  await expect(requestCard).toContainText("Em análise");

  const approveResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/students/pre-registrations/") &&
      response.url().includes("/approve") &&
      response.request().method() === "POST",
  );
  await requestCard.getByRole("button", { name: "Aprovar" }).click();
  const approveResponse = await approveResponsePromise;
  const approveBody = (await approveResponse.json()) as { firstAccessLink: string };
  const firstAccessLink = approveBody.firstAccessLink;

  await expect(requestCard).toContainText("Aprovada");
  await expect(page.getByText("Aluno aprovado com sucesso!")).toBeVisible();
  await expect(page.getByRole("button", { name: /Copiar link de primeiro acesso/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar por email" })).toBeVisible();

  const firstAccessPage = await browser.newPage();
  await firstAccessPage.goto(firstAccessLink);
  await expect(firstAccessPage.getByRole("heading", { name: "Primeiro acesso" })).toBeVisible();
  await firstAccessPage.getByLabel("Criar senha").fill(password);
  await firstAccessPage.getByLabel("Confirmar senha").fill("senha-diferente");
  await expect(firstAccessPage.getByText("As senhas não coincidem.")).toBeVisible();
  await firstAccessPage.getByLabel("Confirmar senha").fill(password);
  await firstAccessPage.getByRole("checkbox").check();
  await firstAccessPage.getByRole("button", { name: "Definir senha e acessar" }).click();
  await expect(firstAccessPage).toHaveURL(/\/sign-in$/);

  await signInAsStudentOnly(firstAccessPage, requestEmail, password);
  await expect(firstAccessPage.getByText(/^Olá,/)).toBeVisible();

  await firstAccessPage.goto(firstAccessLink);
  await expect(firstAccessPage.getByText("já foi utilizado", { exact: false })).toBeVisible();

  await publicPage.goto("/student/first-access/token-invalido-e2e");
  await expect(publicPage.getByText("não é válido", { exact: false })).toBeVisible();

  await publicPage.goto(activeLink);
  await fillPreRegistrationForm(publicPage, {
    name: "Aluno Pré Cadastro Expirado",
    birthDate: "2001-04-18",
    phone: "11955554444",
    email: expiredEmail,
    note: "Expirar token",
  });
  await publicPage.getByRole("button", { name: "Enviar solicitação" }).click();
  const expiredCard = preRegistrationCard(page, expiredEmail);
  const expiredApproveResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/students/pre-registrations/") &&
      response.url().includes("/approve") &&
      response.request().method() === "POST",
  );
  await expiredCard.getByRole("button", { name: "Aprovar" }).click();
  const expiredApproveResponse = await expiredApproveResponsePromise;
  const expiredApproveBody = (await expiredApproveResponse.json()) as { firstAccessLink: string };
  await expireLatestFirstAccess(expiredEmail);
  await publicPage.goto(expiredApproveBody.firstAccessLink);
  await expect(publicPage.getByText("Este link expirou", { exact: false })).toBeVisible();

  await consumeLatestFirstAccess(requestEmail);
  await firstAccessPage.goto(firstAccessLink);
  await expect(firstAccessPage.getByText("já foi utilizado", { exact: false })).toBeVisible();
});

test("rejects a pre-registration request with a reason", async ({ browser, page }) => {
  const requestEmail = `pre-reg-reject-${Date.now()}@tatamiq.local`;

  await openPreRegistrations(page);
  const publicPage = await browser.newPage();
  await publicPage.goto(await currentPreRegistrationLink(page));
  await fillPreRegistrationForm(publicPage, {
    name: "Aluno Rejeitado E2E",
    birthDate: "2000-03-12",
    phone: "11933332222",
    email: requestEmail,
    note: "Rejeitar",
  });
  await publicPage.getByRole("button", { name: "Enviar solicitação" }).click();

  const requestCard = preRegistrationCard(page, requestEmail);
  await requestCard.getByRole("button", { name: "Rejeitar" }).click();
  await page.getByPlaceholder("Motivo interno opcional").fill("Documento pendente");
  await page.getByRole("button", { name: "Confirmar rejeição" }).click();

  await expect(requestCard).toContainText("Rejeitada");
  await expect(requestCard).toContainText("Motivo interno: Documento pendente");
});

test("student invites can be accepted, revoked, and expired", async ({ browser, page }) => {
  const acceptedEmail = `invite-accept-${Date.now()}@tatamiq.local`;
  const acceptedPassword = "tatamiq456";

  await page.goto("/students");
  await expect(page.getByRole("heading", { name: "Alunos" })).toBeVisible();

  const anaRow = studentRow(page, "E2E Ana Presente");
  const inviteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/students/") &&
      response.url().includes("/access-invites") &&
      response.request().method() === "POST",
  );
  await anaRow.getByRole("button", { name: "Gerar convite" }).click();
  const inviteResponse = await inviteResponsePromise;
  const inviteBody = (await inviteResponse.json()) as {
    invite: { inviteId: string };
    inviteLink: string;
  };
  await expect(page.getByText("Link de convite gerado")).toBeVisible();

  const acceptPage = await browser.newPage();
  await acceptPage.goto(inviteBody.inviteLink);
  await expect(acceptPage.getByRole("heading", { name: "Convite do aluno" })).toBeVisible();
  await expect(acceptPage.getByText("Legado Jiu Jitsu")).toBeVisible();
  await expect(acceptPage.getByText("E2E Ana Presente")).toBeVisible();
  await expect(acceptPage.getByRole("link", { name: "Entrar" })).toBeVisible();
  await acceptPage.getByRole("link", { name: "Criar conta" }).click();

  await acceptPage.getByLabel("Nome").fill("Aceite Convite E2E");
  await acceptPage.getByLabel("Email").fill(acceptedEmail);
  await acceptPage.getByLabel("Senha").fill(acceptedPassword);
  await acceptPage.getByRole("button", { name: "Criar conta" }).click();

  await expect(acceptPage.getByRole("heading", { name: "Convite do aluno" })).toBeVisible();
  await acceptPage.getByRole("checkbox").check();
  await acceptPage.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(acceptPage).toHaveURL(/\/(choose-area|student)$/);
  if (
    await acceptPage
      .getByRole("button", { name: "Área do aluno" })
      .isVisible()
      .catch(() => false)
  ) {
    await acceptPage.getByRole("button", { name: "Área do aluno" }).click();
  }
  await expect(acceptPage).toHaveURL(/\/student$/);

  await page.goto("/students");
  const activeRow = studentRow(page, "E2E Ana Presente");
  await expect(activeRow.getByRole("button", { name: "Revogar acesso" })).toBeVisible();
  await activeRow.getByRole("button", { name: "Revogar acesso" }).click();
  await expect(
    activeRow.getByRole("button", { name: /Gerar convite|Gerar novo convite/ }),
  ).toBeVisible();

  const revokedResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/students/") &&
      response.url().includes("/access-invites") &&
      response.request().method() === "POST",
  );
  await activeRow.getByRole("button", { name: /Gerar convite|Gerar novo convite/ }).click();
  const revokedResponse = await revokedResponsePromise;
  const revokedBody = (await revokedResponse.json()) as {
    invite: { inviteId: string };
    inviteLink: string;
  };
  await activeRow.getByRole("button", { name: "Revogar convite" }).click();

  const revokedPage = await browser.newPage();
  await revokedPage.goto(revokedBody.inviteLink);
  await expect(revokedPage.getByText("Este convite não está mais disponível.")).toBeVisible();

  const expiredResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/students/") &&
      response.url().includes("/access-invites") &&
      response.request().method() === "POST",
  );
  await activeRow.getByRole("button", { name: /Gerar convite|Gerar novo convite/ }).click();
  const expiredResponse = await expiredResponsePromise;
  const expiredBody = (await expiredResponse.json()) as {
    invite: { inviteId: string };
    inviteLink: string;
  };
  await expireInvite(expiredBody.invite.inviteId);

  const expiredPage = await browser.newPage();
  await expiredPage.goto(expiredBody.inviteLink);
  await expect(expiredPage.getByText("Este convite não está mais disponível.")).toBeVisible();
});

async function openPreRegistrations(page: Page) {
  await page.goto("/students");
  await expect(page.getByRole("heading", { name: "Alunos" })).toBeVisible();
  await page.getByRole("tab", { name: "Pré-cadastros" }).click();
  await expect(page.getByText("Link de pré-cadastro")).toBeVisible();
}

async function currentPreRegistrationLink(page: Page) {
  const text = await page.locator("text=//pre-register//").first().textContent();
  if (!text) throw new Error("Pre-registration link not found.");
  return text.trim();
}

async function fillPreRegistrationForm(
  page: Page,
  input: {
    name: string;
    birthDate: string;
    phone: string;
    email: string;
    guardianName?: string;
    guardianPhone?: string;
    note?: string;
  },
) {
  await page.getByLabel("Nome completo").fill(input.name);
  await page.getByLabel("Data de nascimento").fill(input.birthDate);
  await page.getByLabel("Telefone/WhatsApp").fill(input.phone);
  await page.getByLabel("Email").fill(input.email);
  if (input.guardianName) {
    await page.getByLabel("Nome do responsável").fill(input.guardianName);
  }
  if (input.guardianPhone) {
    await page.getByLabel("Telefone do responsável").fill(input.guardianPhone);
  }
  if (input.note) {
    await page.getByPlaceholder("Observação opcional").fill(input.note);
  }
  await page.getByRole("checkbox").check();
}

async function signInAsStudentOnly(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/(choose-area|student)$/);
  if (
    await page
      .getByRole("button", { name: "Área do aluno" })
      .isVisible()
      .catch(() => false)
  ) {
    await page.getByRole("button", { name: "Área do aluno" }).click();
  }
  await expect(page).toHaveURL(/\/student$/);
}

function preRegistrationCard(page: Page, email: string): Locator {
  return page.locator('[class*="space-y-4"]').filter({ hasText: email }).first();
}

function studentRow(page: Page, name: string): Locator {
  return page.locator("tbody tr").filter({ hasText: name }).first();
}
