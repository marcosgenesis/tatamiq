type SameSite = "lax" | "strict" | "none";

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function parseSameSite(value: string | undefined): SameSite | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "lax" || normalized === "strict" || normalized === "none") {
    return normalized;
  }
  return undefined;
}

/**
 * Better Auth defaults cookies to SameSite=Lax. That is fine for local
 * same-origin-ish development, but not for local web -> staging API because
 * browser XHR/fetch requests are cross-site. Secure deployed APIs therefore
 * need SameSite=None so the session cookie is sent back after login.
 */
export function resolveAuthCookieOptions(env: NodeJS.ProcessEnv = process.env) {
  const useSecureCookies = parseBoolean(env.COOKIE_SECURE);
  const sameSite = parseSameSite(env.COOKIE_SAME_SITE) ?? (useSecureCookies ? "none" : "lax");
  const domain = env.COOKIE_DOMAIN?.trim();

  return {
    useSecureCookies,
    defaultCookieAttributes: {
      secure: useSecureCookies ?? false,
      sameSite,
    },
    crossSubDomainCookies: domain
      ? {
          enabled: true,
          domain,
        }
      : undefined,
  };
}
