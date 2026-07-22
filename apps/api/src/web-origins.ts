const LOCAL_WEB_ORIGIN = "http://localhost:5173";

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
 * CORS_ORIGIN can add extra browser origins such as local Vite against stg.
 * Both variables accept comma-separated values for deployment flexibility.
 */
export function resolveWebOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const origins = [...splitOrigins(env.WEB_APP_URL), ...splitOrigins(env.CORS_ORIGIN)];
  const uniqueOrigins = [...new Set(origins)];

  return uniqueOrigins.length > 0 ? uniqueOrigins : [LOCAL_WEB_ORIGIN];
}
