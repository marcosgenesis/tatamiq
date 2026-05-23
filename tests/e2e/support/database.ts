import { execFileSync } from "node:child_process";

const DEFAULT_DATABASE_URL = "postgres://tatamiq:tatamiq@localhost:5432/tatamiq";

export function assertE2eDatabaseIsLocal() {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const hostname = new URL(databaseUrl).hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  if (!isLocal && process.env.E2E_ALLOW_NON_LOCAL_DATABASE !== "true") {
    throw new Error(
      `Refusing to run E2E migrations/seeds against non-local DATABASE_URL (${hostname}). ` +
        "Set E2E_ALLOW_NON_LOCAL_DATABASE=true only if this is intentional.",
    );
  }
}

export function runDatabaseScript(script: "db:migrate" | "db:seed" | "db:seed:e2e") {
  execFileSync("pnpm", ["--filter", "@tatamiq/database", script], {
    stdio: "inherit",
    env: process.env,
  });
}

export function resetE2eFixture() {
  runDatabaseScript("db:seed:e2e");
}
