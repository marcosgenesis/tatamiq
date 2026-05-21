import { expect, test } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://localhost:3000";

test("API health and demo academy endpoints respond", async ({ request }) => {
  const healthResponse = await request.get(`${apiUrl}/health`);
  await expect(healthResponse).toBeOK();
  await expect(await healthResponse.json()).toMatchObject({ status: "ok" });

  const academyResponse = await request.get(`${apiUrl}/academies/demo`);
  await expect(academyResponse).toBeOK();
  await expect(await academyResponse.json()).toMatchObject({ name: "Academia Demo" });
});

test("web status dashboard shows API and database status", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "V0 scaffold" })).toBeVisible();
  await expect(page.getByText("API health")).toBeVisible();
  await expect(page.getByText("Demo academy")).toBeVisible();
  await expect(page.getByText("ok")).toBeVisible();
  await expect(page.getByText("Academia Demo")).toBeVisible();
});
