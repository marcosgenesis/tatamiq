import { describe, expect, it, vi } from "vitest";
import { createPublicAccount } from "./auth-pages";

describe("createPublicAccount", () => {
  it("clears any previous browser session before creating a public account", async () => {
    const calls: string[] = [];

    const result = await createPublicAccount({
      name: "Novo Dono",
      email: "novo-dono@tatamiq.local",
      password: "tatamiq123",
      signOut: vi.fn(async () => {
        calls.push("signOut");
      }),
      signUp: vi.fn(async () => {
        calls.push("signUp");
        return {};
      }),
      clearSessionCache: vi.fn(() => {
        calls.push("clearSessionCache");
      }),
    });

    expect(result).toEqual({});
    expect(calls).toEqual(["signOut", "clearSessionCache", "signUp", "clearSessionCache"]);
  });

  it("still attempts sign-up when there is no previous session to sign out", async () => {
    await expect(
      createPublicAccount({
        name: "Novo Dono",
        email: "novo-dono@tatamiq.local",
        password: "tatamiq123",
        signOut: vi.fn(async () => {
          throw new Error("not signed in");
        }),
        signUp: vi.fn(async () => ({})),
        clearSessionCache: vi.fn(),
      }),
    ).resolves.toEqual({});
  });
});
