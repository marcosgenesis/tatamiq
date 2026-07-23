import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createDatabase } from "@tatamiq/database";
import * as schema from "@tatamiq/database/schema";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { admin, organization } from "better-auth/plugins";
import { resolveAuthCookieOptions } from "./auth-cookies";
import { seedIbjjfBelts } from "./belts/seed-belts";
import { resolveWebOrigins } from "./web-origins";

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 120;

/**
 * Trims and collapses whitespace, then enforces min/max length bounds.
 * Throws a 400 APIError when out of bounds so names are never stored blank
 * or oversized (an unbounded name breaks downstream layouts and storage).
 */
function normalizeName(rawName: unknown, labels: { tooShort: string; tooLong: string }): string {
  const name = typeof rawName === "string" ? rawName.trim().replace(/\s+/g, " ") : "";

  if (name.length < MIN_NAME_LENGTH) {
    throw new APIError("BAD_REQUEST", { code: "NAME_TOO_SHORT", message: labels.tooShort });
  }

  if (name.length > MAX_NAME_LENGTH) {
    throw new APIError("BAD_REQUEST", { code: "NAME_TOO_LONG", message: labels.tooLong });
  }

  return name;
}

/** Validates a user-supplied display name for the sign-up endpoint. */
export function normalizeUserName(rawName: unknown): string {
  return normalizeName(rawName, {
    tooShort: `O nome deve ter ao menos ${MIN_NAME_LENGTH} caracteres.`,
    tooLong: `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`,
  });
}

/** Validates an academy (organization) name at creation time. */
export function normalizeOrganizationName(rawName: unknown): string {
  return normalizeName(rawName, {
    tooShort: `O nome da academia deve ter ao menos ${MIN_NAME_LENGTH} caracteres.`,
    tooLong: `O nome da academia deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`,
  });
}

const apiUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3100";
const webOrigins = resolveWebOrigins();

const db = createDatabase();
export const DEV_BETTER_AUTH_SECRET =
  "dev-only-tatamiq-better-auth-secret-change-me-minimum-32-chars";

export function platformAdminUserIds(): string[] {
  return (process.env.BETTER_AUTH_ADMIN_USER_IDS ?? process.env.PLATFORM_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function resolveBetterAuthSecret(env: NodeJS.ProcessEnv = process.env): string {
  const configuredSecret = env.BETTER_AUTH_SECRET?.trim();
  if (configuredSecret) return configuredSecret;

  const nodeEnv = env.NODE_ENV?.trim();
  if (!nodeEnv || nodeEnv === "development" || nodeEnv === "test") {
    return DEV_BETTER_AUTH_SECRET;
  }

  throw new Error(
    "BETTER_AUTH_SECRET must be configured when NODE_ENV is not local development or test.",
  );
}

export function resolveQrTokenSecret(env: NodeJS.ProcessEnv = process.env): string {
  const configuredQrSecret = env.QR_TOKEN_SECRET?.trim();
  if (configuredQrSecret) return configuredQrSecret;

  const configuredAuthSecret = env.BETTER_AUTH_SECRET?.trim();
  if (configuredAuthSecret) return configuredAuthSecret;

  const nodeEnv = env.NODE_ENV?.trim();
  if (!nodeEnv || nodeEnv === "development" || nodeEnv === "test") {
    return DEV_BETTER_AUTH_SECRET;
  }

  throw new Error(
    "QR_TOKEN_SECRET or BETTER_AUTH_SECRET must be configured when NODE_ENV is not local development or test.",
  );
}

export const auth = betterAuth({
  appName: "Tatamiq",
  baseURL: apiUrl,
  basePath: "/auth",
  secret: resolveBetterAuthSecret(),
  trustedOrigins: webOrigins,
  advanced: resolveAuthCookieOptions(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user }) => {
      console.log({
        event: "password_reset_link_created",
        email: user.email,
        delivery: "dev-log",
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return { data: { ...user, name: normalizeUserName(user.name) } };
        },
      },
    },
  },
  plugins: [
    admin({
      adminUserIds: platformAdminUserIds(),
      impersonationSessionDuration: 60 * 60,
    }),
    organization({
      organizationLimit: 1,
      creatorRole: "owner",
      disableOrganizationDeletion: true,
      organizationHooks: {
        beforeCreateOrganization: async ({ organization }) => {
          return {
            data: { ...organization, name: normalizeOrganizationName(organization.name) },
          };
        },
        afterCreateOrganization: async ({ organization }) => {
          await seedIbjjfBelts(db, organization.id);
        },
      },
    }),
  ],
});

export type Auth = typeof auth;
