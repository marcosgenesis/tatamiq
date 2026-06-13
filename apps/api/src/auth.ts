import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createDatabase } from "@tatamiq/database";
import * as schema from "@tatamiq/database/schema";
import { betterAuth } from "better-auth";
import { admin, organization } from "better-auth/plugins";
import { seedIbjjfBelts } from "./belts/seed-belts";

const apiUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3100";
const webUrl = process.env.WEB_APP_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:5173";

const db = createDatabase();
const DEV_BETTER_AUTH_SECRET = "dev-only-tatamiq-better-auth-secret-change-me-minimum-32-chars";

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

export const auth = betterAuth({
  appName: "Tatamiq",
  baseURL: apiUrl,
  basePath: "/auth",
  secret: resolveBetterAuthSecret(),
  trustedOrigins: [webUrl],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user }) => {
      console.log({
        event: "password_reset_link_created",
        email: user.email,
        delivery: "dev-log",
      });
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
        afterCreateOrganization: async ({ organization }) => {
          await seedIbjjfBelts(db, organization.id);
        },
      },
    }),
  ],
});

export type Auth = typeof auth;
