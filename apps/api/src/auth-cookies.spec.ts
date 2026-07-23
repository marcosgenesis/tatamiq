import { describe, expect, it } from "vitest";
import { resolveAuthCookieOptions } from "./auth-cookies";

describe("resolveAuthCookieOptions", () => {
  it("keeps local HTTP cookies usable by default", () => {
    expect(resolveAuthCookieOptions({})).toEqual({
      useSecureCookies: undefined,
      defaultCookieAttributes: {
        secure: false,
        sameSite: "lax",
      },
      crossSubDomainCookies: undefined,
    });
  });

  it("uses SameSite=None for secure deployed API cookies", () => {
    expect(resolveAuthCookieOptions({ COOKIE_SECURE: "true" })).toMatchObject({
      useSecureCookies: true,
      defaultCookieAttributes: {
        secure: true,
        sameSite: "none",
      },
    });
  });

  it("allows explicit SameSite override", () => {
    expect(
      resolveAuthCookieOptions({ COOKIE_SECURE: "true", COOKIE_SAME_SITE: "lax" }),
    ).toMatchObject({
      defaultCookieAttributes: {
        secure: true,
        sameSite: "lax",
      },
    });
  });

  it("enables cross-subdomain cookies only when COOKIE_DOMAIN is set", () => {
    expect(
      resolveAuthCookieOptions({ COOKIE_SECURE: "true", COOKIE_DOMAIN: ".tatamiq.com.br" }),
    ).toMatchObject({
      crossSubDomainCookies: {
        enabled: true,
        domain: ".tatamiq.com.br",
      },
    });
  });
});
