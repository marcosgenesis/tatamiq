import { describe, expect, it } from "vitest";
import { preRegistrationErrorMessage } from "./pre-registration-page";

describe("preRegistrationErrorMessage", () => {
  it("surfaces the specific public throttling message", () => {
    expect(
      preRegistrationErrorMessage({
        message: "Muitas tentativas de pré-cadastro. Aguarde alguns minutos e tente novamente.",
      }),
    ).toBe("Muitas tentativas de pré-cadastro. Aguarde alguns minutos e tente novamente.");
  });

  it("falls back to the generic submission failure", () => {
    expect(preRegistrationErrorMessage(null)).toBe("Não foi possível enviar sua solicitação.");
  });
});
