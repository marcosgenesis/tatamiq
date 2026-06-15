import { defineConfig, devices } from "@playwright/test";

const webUrl = process.env.E2E_WEB_URL ?? "http://localhost:5173";
const apiUrl = process.env.E2E_API_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: webUrl,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm dev",
      cwd: "apps/api",
      url: `${apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: new URL(apiUrl).port,
        CORS_ORIGIN: webUrl,
        E2E: "true",
      },
    },
    {
      command: "pnpm dev",
      cwd: "apps/web",
      url: webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_URL: apiUrl,
      },
    },
  ],
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
