import { expect, test } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://localhost:3100";

test("API health and demo academy endpoints respond", async ({ request }) => {
  const healthResponse = await request.get(`${apiUrl}/health`);
  await expect(healthResponse).toBeOK();
  await expect(await healthResponse.json()).toMatchObject({ status: "ok" });

  const academyResponse = await request.get(`${apiUrl}/academies/demo`);
  await expect(academyResponse).toBeOK();
  await expect(await academyResponse.json()).toMatchObject({ name: "Academia Demo" });
});

test("web app shows instructor dashboard shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
  await expect(page.getByText("Tatamiq").first()).toBeVisible();
  await expect(page.getByText("Academia Demo").first()).toBeVisible();

  for (const label of [
    "Alunos",
    "Turmas",
    "Agenda",
    "Presenças",
    "Graduação",
    "Mensalidades",
    "Configurações",
  ]) {
    await expect(page.getByText(label).first()).toBeVisible();
  }

  for (const card of [
    "Aulas de hoje",
    "Pagamentos em verificação",
    "Mensalidades atrasadas",
    "Elegíveis para graduação",
    "Convites pendentes",
  ]) {
    await expect(page.getByText(card)).toBeVisible();
  }
});
