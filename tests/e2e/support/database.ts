import { execFileSync } from "node:child_process";
import { createDatabase, user, verification } from "@tatamiq/database";
import { desc, eq, like } from "drizzle-orm";

const DEFAULT_DATABASE_URL = "postgres://tatamiq:tatamiq@localhost:5432/tatamiq";
const db = createDatabase();

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

/**
 * Reads the newest Better Auth verification token directly from the local test DB.
 * Password-reset emails are not delivered in E2E, so specs consume the token here.
 */
export async function getLatestVerificationToken(identifier: string) {
  const [record] = await db
    .select({ identifier: verification.identifier, value: verification.value })
    .from(verification)
    .where(
      identifier === "password-reset"
        ? like(verification.identifier, "reset-password:%")
        : eq(verification.identifier, identifier),
    )
    .orderBy(desc(verification.createdAt))
    .limit(1);

  if (!record?.identifier) {
    throw new Error(`No verification token found for identifier: ${identifier}`);
  }

  return record.identifier.startsWith("reset-password:")
    ? record.identifier.slice("reset-password:".length)
    : record.value;
}

export async function getLatestPasswordResetToken(email?: string) {
  if (!email) return getLatestVerificationToken("password-reset");

  const [account] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!account?.id) {
    throw new Error(`No user found for email: ${email}`);
  }

  const records = await db
    .select({ identifier: verification.identifier, value: verification.value })
    .from(verification)
    .where(like(verification.identifier, "reset-password:%"))
    .orderBy(desc(verification.createdAt))
    .limit(20);

  const matchingRecord = records.find((candidate) => candidate.value === account.id);
  if (!matchingRecord?.identifier) {
    throw new Error(`No password reset token found for email: ${email}`);
  }

  return matchingRecord.identifier.slice("reset-password:".length);
}
