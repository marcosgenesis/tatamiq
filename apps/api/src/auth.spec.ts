import { afterEach, describe, expect, it, vi } from "vitest";
import { generateQrToken, verifyQrToken } from "./classes/qr-token";

vi.mock("@tatamiq/database", () => ({
  createDatabase: vi.fn(() => ({})),
}));

vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({}) as never),
}));

vi.mock("@better-auth/drizzle-adapter", () => ({
  drizzleAdapter: vi.fn(() => ({})),
}));

vi.mock("./belts/seed-belts", () => ({
  seedIbjjfBelts: vi.fn(),
}));

const OLD_ENV = process.env;

describe("resolveBetterAuthSecret", () => {
  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("returns the configured BETTER_AUTH_SECRET after trimming", async () => {
    const { resolveBetterAuthSecret } = await import("./auth");

    expect(
      resolveBetterAuthSecret({
        ...OLD_ENV,
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: "  configured-secret  ",
      }),
    ).toBe("configured-secret");
  });

  it("returns the dev fallback in development when secret is absent", async () => {
    const { DEV_BETTER_AUTH_SECRET, resolveBetterAuthSecret } = await import("./auth");

    expect(
      resolveBetterAuthSecret({
        ...OLD_ENV,
        NODE_ENV: "development",
        BETTER_AUTH_SECRET: "",
      }),
    ).toBe(DEV_BETTER_AUTH_SECRET);
  });

  it("returns the dev fallback in test when secret is absent", async () => {
    const { DEV_BETTER_AUTH_SECRET, resolveBetterAuthSecret } = await import("./auth");

    expect(
      resolveBetterAuthSecret({
        ...OLD_ENV,
        NODE_ENV: "test",
        BETTER_AUTH_SECRET: "",
      }),
    ).toBe(DEV_BETTER_AUTH_SECRET);
  });

  it("throws in production when secret is absent", async () => {
    const { resolveBetterAuthSecret } = await import("./auth");

    expect(() =>
      resolveBetterAuthSecret({
        ...OLD_ENV,
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: "",
      }),
    ).toThrowError(/BETTER_AUTH_SECRET/);
  });

  it("mentions BETTER_AUTH_SECRET without leaking the fallback value", async () => {
    const { DEV_BETTER_AUTH_SECRET, resolveBetterAuthSecret } = await import("./auth");

    try {
      resolveBetterAuthSecret({
        ...OLD_ENV,
        NODE_ENV: "staging",
        BETTER_AUTH_SECRET: "",
      });
      throw new Error("expected resolveBetterAuthSecret to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("BETTER_AUTH_SECRET");
      expect(message).not.toContain(DEV_BETTER_AUTH_SECRET);
    }
  });
});

describe("resolveQrTokenSecret", () => {
  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("returns the configured QR_TOKEN_SECRET after trimming", async () => {
    const { resolveQrTokenSecret } = await import("./auth");

    expect(
      resolveQrTokenSecret({
        ...OLD_ENV,
        NODE_ENV: "production",
        QR_TOKEN_SECRET: "  qr-secret  ",
        BETTER_AUTH_SECRET: "auth-secret",
      }),
    ).toBe("qr-secret");
  });

  it("falls back to the trimmed BETTER_AUTH_SECRET when QR secret is absent", async () => {
    const { resolveQrTokenSecret } = await import("./auth");

    expect(
      resolveQrTokenSecret({
        ...OLD_ENV,
        NODE_ENV: "production",
        QR_TOKEN_SECRET: "",
        BETTER_AUTH_SECRET: "  auth-secret  ",
      }),
    ).toBe("auth-secret");
  });

  it("returns the dev fallback in local environments when both secrets are absent", async () => {
    const { DEV_BETTER_AUTH_SECRET, resolveQrTokenSecret } = await import("./auth");

    expect(
      resolveQrTokenSecret({
        ...OLD_ENV,
        NODE_ENV: "development",
        QR_TOKEN_SECRET: "",
        BETTER_AUTH_SECRET: "",
      }),
    ).toBe(DEV_BETTER_AUTH_SECRET);

    expect(
      resolveQrTokenSecret({
        ...OLD_ENV,
        NODE_ENV: "test",
        QR_TOKEN_SECRET: "",
        BETTER_AUTH_SECRET: "",
      }),
    ).toBe(DEV_BETTER_AUTH_SECRET);

    expect(
      resolveQrTokenSecret({
        ...OLD_ENV,
        NODE_ENV: "",
        QR_TOKEN_SECRET: "",
        BETTER_AUTH_SECRET: "",
      }),
    ).toBe(DEV_BETTER_AUTH_SECRET);
  });

  it("throws in production-like environments when both secrets are absent", async () => {
    const { resolveQrTokenSecret } = await import("./auth");

    expect(() =>
      resolveQrTokenSecret({
        ...OLD_ENV,
        NODE_ENV: "production",
        QR_TOKEN_SECRET: "",
        BETTER_AUTH_SECRET: "",
      }),
    ).toThrowError(/QR_TOKEN_SECRET|BETTER_AUTH_SECRET/);
  });

  it("mentions config keys without leaking the fallback value", async () => {
    const { DEV_BETTER_AUTH_SECRET, resolveQrTokenSecret } = await import("./auth");

    try {
      resolveQrTokenSecret({
        ...OLD_ENV,
        NODE_ENV: "staging",
        QR_TOKEN_SECRET: "",
        BETTER_AUTH_SECRET: "",
      });
      throw new Error("expected resolveQrTokenSecret to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("QR_TOKEN_SECRET");
      expect(message).toContain("BETTER_AUTH_SECRET");
      expect(message).not.toContain(DEV_BETTER_AUTH_SECRET);
    }
  });

  it("uses the same local fallback secret for generation and validation", async () => {
    const { resolveQrTokenSecret } = await import("./auth");
    const resolvedSecret = resolveQrTokenSecret({
      ...OLD_ENV,
      NODE_ENV: "test",
      QR_TOKEN_SECRET: "",
      BETTER_AUTH_SECRET: "",
    });
    const now = new Date("2026-05-23T10:00:15.000Z");
    const { token } = generateQrToken("class-1", "academy-1", resolvedSecret, now);

    expect(verifyQrToken(token, resolvedSecret, now)).toEqual({
      classSessionId: "class-1",
      organizationId: "academy-1",
    });
  });
});
