import { describe, expect, it } from "vitest";
import { describeCreateAcademyError } from "./academy-onboarding-page";

describe("describeCreateAcademyError", () => {
  it("maps a name that is too short", () => {
    expect(describeCreateAcademyError({ code: "NAME_TOO_SHORT" })).toBe(
      "O nome da academia deve ter ao menos 2 caracteres.",
    );
  });

  it("maps a name that is too long", () => {
    expect(describeCreateAcademyError({ code: "NAME_TOO_LONG" })).toBe(
      "O nome da academia deve ter no máximo 120 caracteres.",
    );
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(describeCreateAcademyError({ code: "WHATEVER" })).toBe(
      "Não foi possível criar sua academia. Tente novamente.",
    );
    expect(describeCreateAcademyError(null)).toBe(
      "Não foi possível criar sua academia. Tente novamente.",
    );
  });
});
