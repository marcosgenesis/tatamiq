import { describe, expect, it } from "vitest";
import { createAcademySlug } from "./academy-slug";

describe("createAcademySlug", () => {
  it("normalizes the academy name and appends a short suffix", () => {
    expect(createAcademySlug("Alliance Vila Mariana", () => "k7p9")).toBe(
      "alliance-vila-mariana-k7p9",
    );
  });

  it("falls back to academia when the name has no slug-safe characters", () => {
    expect(createAcademySlug("!!!", () => "a1b2")).toBe("academia-a1b2");
  });
});
