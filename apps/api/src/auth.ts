import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createDatabase } from "@tatamiq/database";
import * as schema from "@tatamiq/database/schema";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

const apiUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3100";
const webUrl = process.env.WEB_APP_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:5173";

export const auth = betterAuth({
  appName: "Tatamiq",
  baseURL: apiUrl,
  basePath: "/auth",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "dev-only-tatamiq-better-auth-secret-change-me-minimum-32-chars",
  trustedOrigins: [webUrl],
  database: drizzleAdapter(createDatabase(), {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      console.log({
        event: "password_reset_link_created",
        email: user.email,
        url,
      });
    },
  },
  plugins: [
    organization({
      organizationLimit: 1,
      creatorRole: "owner",
      disableOrganizationDeletion: true,
    }),
  ],
});

export type Auth = typeof auth;
