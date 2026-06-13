import { afterEach, describe, expect, it, vi } from "vitest";

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
    const { resolveBetterAuthSecret } = await import("./auth");

    expect(
      resolveBetterAuthSecret({
        ...OLD_ENV,
        NODE_ENV: "development",
        BETTER_AUTH_SECRET: "",
      }),
    ).toBe("dev-only-tatamiq-better-auth-secret-change-me-minimum-32-chars");
  });

  it("returns the dev fallback in test when secret is absent", async () => {
    const { resolveBetterAuthSecret } = await import("./auth");

    expect(
      resolveBetterAuthSecret({
        ...OLD_ENV,
        NODE_ENV: "test",
        BETTER_AUTH_SECRET: "",
      }),
    ).toBe("dev-only-tatamiq-better-auth-secret-change-me-minimum-32-chars");
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
    const { resolveBetterAuthSecret } = await import("./auth");

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
      expect(message).not.toContain(
        "dev-only-tatamiq-better-auth-secret-change-me-minimum-32-chars",
      );
    }
  });
});
