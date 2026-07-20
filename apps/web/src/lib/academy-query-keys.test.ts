import { describe, expect, it } from "vitest";
import { academyQueryKey, onboardingChecklistQueryKey } from "./academy-query-keys";

describe("academyQueryKey", () => {
  it("scopes operational cache keys by academy", () => {
    expect(academyQueryKey("academy-1", "students", "active")).toEqual([
      "academy",
      "academy-1",
      "students",
      "active",
    ]);
    expect(academyQueryKey("academy-1", "students")).not.toEqual(
      academyQueryKey("academy-2", "students"),
    );
  });

  it("builds a dedicated onboarding checklist key", () => {
    expect(onboardingChecklistQueryKey("academy-1")).toEqual([
      "academy",
      "academy-1",
      "onboarding-checklist",
    ]);
  });
});
