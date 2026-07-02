import { describe, expect, it, vi } from "vitest";
import { createPublicAccount, describeSignUpError, validateSignUpInput } from "./auth-pages";

describe("validateSignUpInput", () => {
  it("accepts valid input", () => {
    expect(
      validateSignUpInput({ name: "Maria Silva", email: "maria@test.com", password: "senha1234" }),
    ).toBeNull();
  });

  it("rejects blank or whitespace-only names", () => {
    expect(
      validateSignUpInput({ name: "   ", email: "maria@test.com", password: "senha1234" }),
    ).toBe("Informe seu nome completo.");
  });

  it("rejects malformed emails", () => {
    expect(validateSignUpInput({ name: "Maria", email: "naoehemail", password: "senha1234" })).toBe(
      "Informe um email válido.",
    );
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(
      validateSignUpInput({ name: "Maria", email: "maria@test.com", password: "1234567" }),
    ).toBe("A senha deve ter ao menos 8 caracteres.");
  });
});

describe("describeSignUpError", () => {
  it("maps duplicate email", () => {
    expect(describeSignUpError({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" })).toBe(
      "Este email já está em uso. Tente entrar ou recuperar sua senha.",
    );
  });

  it("maps password too short", () => {
    expect(describeSignUpError({ code: "PASSWORD_TOO_SHORT" })).toBe(
      "A senha deve ter ao menos 8 caracteres.",
    );
  });

  it("maps invalid email validation error", () => {
    expect(describeSignUpError({ code: "VALIDATION_ERROR" })).toBe("Informe um email válido.");
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(describeSignUpError({ code: "SOMETHING_ELSE" })).toBe(
      "Não foi possível criar a conta. Tente novamente em instantes.",
    );
    expect(describeSignUpError(null)).toBe(
      "Não foi possível criar a conta. Tente novamente em instantes.",
    );
  });
});

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
