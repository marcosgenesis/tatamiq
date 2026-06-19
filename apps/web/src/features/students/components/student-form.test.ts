import { describe, expect, it } from "vitest";
import { validateKnownBeltSelection } from "./student-form";

describe("validateKnownBeltSelection", () => {
  it("accepts a belt id from the active Academy belt list", () => {
    expect(
      validateKnownBeltSelection("5821afe8-7ec1-46ae-8085-9bc48d14b695", [
        { id: "5821afe8-7ec1-46ae-8085-9bc48d14b695" },
      ]),
    ).toBeNull();
  });

  it("rejects a stale or cross-Academy belt id before submitting", () => {
    expect(
      validateKnownBeltSelection("5821afe8-7ec1-46ae-8085-9bc48d14b695", [
        { id: "other-active-academy-belt" },
      ]),
    ).toBe("Selecione uma faixa da Academia ativa.");
  });
});
