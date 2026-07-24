import { afterEach, describe, expect, it } from "vitest";
import { apiBaseUrl, preRegistrationSharePage } from "./pre-registration-share-page";

describe("pre-registration share page", () => {
  afterEach(() => {
    delete process.env.BETTER_AUTH_URL;
  });

  it("renders academy metadata and redirects visitors to the form", () => {
    const html = preRegistrationSharePage(
      { name: "CT Central & Filhos", logo: "https://cdn.example.com/logo.png" },
      "https://app.example.com/pre-register/token",
    );

    expect(html).toContain('property="og:title" content="Pré-cadastro · CT Central &amp; Filhos"');
    expect(html).toContain('property="og:image" content="https://cdn.example.com/logo.png"');
    expect(html).toContain('content="0;url=https://app.example.com/pre-register/token"');
    expect(html).not.toContain("CT Central & Filhos");
  });

  it("reuses the existing authentication API origin for copied links", () => {
    process.env.BETTER_AUTH_URL = "https://api.example.com/";
    expect(apiBaseUrl()).toBe("https://api.example.com");
  });
});
