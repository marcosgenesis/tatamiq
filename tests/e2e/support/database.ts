import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  account,
  createDatabase,
  member,
  organization,
  preRegistrationRequests,
  studentAccess,
  studentAccessInvites,
  user,
  verification,
} from "@tatamiq/database";
import { hashPassword } from "better-auth/crypto";
import { and, desc, eq, like } from "drizzle-orm";

const DEFAULT_DATABASE_URL = "postgres://tatamiq:tatamiq@localhost:5432/tatamiq";
const DEV_ORG_SLUG = "academia-de-teste-dev";
const db = createDatabase();

export const PLATFORM_FIXTURES = {
  bannable: {
    email: "platform.bannable.e2e@tatamiq.local",
    name: "Platform Bannable E2E",
  },
  deleteDefinitive: {
    email: "platform.delete.definitive.e2e@tatamiq.local",
    name: "Platform Delete Definitive E2E",
  },
  deletePreserve: {
    email: "platform.delete.preserve.e2e@tatamiq.local",
    name: "Platform Delete Preserve E2E",
  },
  academyOwner: {
    email: "platform.owner.e2e@tatamiq.local",
    name: "Platform Owner E2E",
    academyName: "Academia Platform Owner E2E",
    academySlug: "academia-platform-owner-e2e",
  },
} as const;

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

  const [accountUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!accountUser?.id) {
    throw new Error(`No user found for email: ${email}`);
  }

  const records = await db
    .select({ identifier: verification.identifier, value: verification.value })
    .from(verification)
    .where(like(verification.identifier, "reset-password:%"))
    .orderBy(desc(verification.createdAt))
    .limit(20);

  const matchingRecord = records.find((candidate) => candidate.value === accountUser.id);
  if (!matchingRecord?.identifier) {
    throw new Error(`No password reset token found for email: ${email}`);
  }

  return matchingRecord.identifier.slice("reset-password:".length);
}

export async function ensurePlatformFixtures(password = "tatamiq123") {
  await cleanupPlatformFixtures();

  const [devOrg] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, DEV_ORG_SLUG))
    .limit(1);
  if (!devOrg?.id) throw new Error("Dev organization not found.");

  const bannable = await ensurePasswordUser({
    email: PLATFORM_FIXTURES.bannable.email,
    name: PLATFORM_FIXTURES.bannable.name,
    password,
  });
  const definitive = await ensurePasswordUser({
    email: PLATFORM_FIXTURES.deleteDefinitive.email,
    name: PLATFORM_FIXTURES.deleteDefinitive.name,
    password,
  });
  const preserve = await ensurePasswordUser({
    email: PLATFORM_FIXTURES.deletePreserve.email,
    name: PLATFORM_FIXTURES.deletePreserve.name,
    password,
  });
  const academyOwner = await ensurePasswordUser({
    email: PLATFORM_FIXTURES.academyOwner.email,
    name: PLATFORM_FIXTURES.academyOwner.name,
    password,
  });

  await db.insert(member).values({
    id: randomUUID(),
    organizationId: devOrg.id,
    userId: preserve.id,
    role: "member",
  });

  const ownerOrgId = randomUUID();
  await db.insert(organization).values({
    id: ownerOrgId,
    name: PLATFORM_FIXTURES.academyOwner.academyName,
    slug: PLATFORM_FIXTURES.academyOwner.academySlug,
    phone: "(85) 90000-0001",
    pixKeyType: "email",
    pixKey: "platform-owner-e2e@pix.local",
  });
  await db.insert(member).values({
    id: randomUUID(),
    organizationId: ownerOrgId,
    userId: academyOwner.id,
    role: "owner",
  });

  return {
    bannableUserId: bannable.id,
    definitiveUserId: definitive.id,
    preserveUserId: preserve.id,
    ownerUserId: academyOwner.id,
    ownerOrganizationId: ownerOrgId,
  };
}

export async function expireInvite(inviteId: string) {
  await db
    .update(studentAccessInvites)
    .set({ expiresAt: new Date(Date.now() - 60_000), updatedAt: new Date() })
    .where(eq(studentAccessInvites.id, inviteId));
}

export async function consumeLatestFirstAccess(email: string) {
  await updateLatestFirstAccessByEmail(email, {
    firstAccessConsumedAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function expireLatestFirstAccess(email: string) {
  await updateLatestFirstAccessByEmail(email, {
    firstAccessTokenExpiresAt: new Date(Date.now() - 60_000),
    updatedAt: new Date(),
  });
}

export async function markStudentIndicatorsUnseen(email: string) {
  const [row] = await db
    .select({ id: studentAccess.id })
    .from(studentAccess)
    .innerJoin(user, eq(studentAccess.authUserId, user.id))
    .where(eq(user.email, email))
    .limit(1);
  if (!row?.id) throw new Error(`No student access found for ${email}`);

  const oldDate = new Date("2000-01-01T00:00:00.000Z");
  await db
    .update(studentAccess)
    .set({
      lastSeenFeesAt: oldDate,
      lastSeenGraduationAt: oldDate,
      lastSeenScheduleAt: oldDate,
      lastSeenNotesAt: oldDate,
      updatedAt: new Date(),
    })
    .where(eq(studentAccess.id, row.id));
}

async function updateLatestFirstAccessByEmail(
  email: string,
  values: Partial<typeof preRegistrationRequests.$inferInsert>,
) {
  const [request] = await db
    .select({ id: preRegistrationRequests.id })
    .from(preRegistrationRequests)
    .where(eq(preRegistrationRequests.email, email.toLowerCase()))
    .orderBy(desc(preRegistrationRequests.createdAt))
    .limit(1);
  if (!request?.id) throw new Error(`No pre-registration request found for ${email}`);

  await db
    .update(preRegistrationRequests)
    .set(values)
    .where(eq(preRegistrationRequests.id, request.id));
}

async function cleanupPlatformFixtures() {
  await db
    .delete(organization)
    .where(eq(organization.slug, PLATFORM_FIXTURES.academyOwner.academySlug));
  await deleteUserByEmail(PLATFORM_FIXTURES.academyOwner.email);
  await deleteUserByEmail(PLATFORM_FIXTURES.deletePreserve.email);
  await deleteUserByEmail(PLATFORM_FIXTURES.deleteDefinitive.email);
  await deleteUserByEmail(PLATFORM_FIXTURES.bannable.email);
}

async function deleteUserByEmail(email: string) {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (!existing?.id) return;
  await db.delete(user).where(eq(user.id, existing.id));
}

async function ensurePasswordUser(input: {
  email: string;
  name: string;
  password: string;
  role?: string | null;
}) {
  const now = new Date();
  const normalizedEmail = input.email.trim().toLowerCase();
  const hashedPassword = await hashPassword(input.password);

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, normalizedEmail))
    .limit(1);

  const userId = existing?.id ?? randomUUID();

  if (existing) {
    await db
      .update(user)
      .set({
        name: input.name,
        role: input.role ?? null,
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: now,
      })
      .where(eq(user.id, userId));
  } else {
    await db.insert(user).values({
      id: userId,
      name: input.name,
      email: normalizedEmail,
      emailVerified: true,
      role: input.role ?? null,
      banned: false,
      banReason: null,
      banExpires: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const [existingAccount] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);

  if (existingAccount) {
    await db
      .update(account)
      .set({ password: hashedPassword, updatedAt: now })
      .where(eq(account.id, existingAccount.id));
  } else {
    await db.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { id: userId };
}
