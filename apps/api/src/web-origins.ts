const LOCAL_WEB_ORIGIN = "http://localhost:5173";
const LOCAL_TOTEM_ORIGIN = "http://localhost:5174";
const STUDENT_APP_ORIGINS = ["tatamiq-student://", "tatamiq-student://*"];

function splitOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Origins allowed to use browser-authenticated API requests.
 *
 * WEB_APP_URL remains the canonical frontend URL used in links, while
 * TOTEM_APP_URL is the origin of the Totem da Academia client, and
 * CORS_ORIGIN can add extra browser origins such as local Vite against stg.
 * All variables accept comma-separated values for deployment flexibility.
 */
export function resolveWebOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const origins = [
    ...splitOrigins(env.WEB_APP_URL),
    ...splitOrigins(env.TOTEM_APP_URL),
    ...splitOrigins(env.CORS_ORIGIN),
  ];
  const uniqueOrigins = [...new Set(origins)];

  return uniqueOrigins.length > 0 ? uniqueOrigins : [LOCAL_WEB_ORIGIN, LOCAL_TOTEM_ORIGIN];
}

/** Origins trusted by Better Auth, including the native Expo app callbacks. */
export function resolveTrustedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const origins = [...resolveWebOrigins(env), ...STUDENT_APP_ORIGINS];
  if (env.NODE_ENV === "development") {
    origins.push("exp://", "exp://**");
  }
  return [...new Set(origins)];
}
