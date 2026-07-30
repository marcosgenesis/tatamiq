import { describe, expect, it } from "vitest";
import { chooseAreaDestination } from "./choose-area-page";

const resolvedAreas = {
  areasLoading: false,
  organizationsResolvedForSession: true,
  hasOrganizationsError: false,
  hasPlatform: false,
  hasInstructor: false,
  hasStudent: false,
};

describe("chooseAreaDestination", () => {
  it("does not send an instructor to onboarding before organizations are refreshed after login", () => {
    expect(
      chooseAreaDestination({
        ...resolvedAreas,
        organizationsResolvedForSession: false,
      }),
    ).toBeNull();

    expect(
      chooseAreaDestination({
        ...resolvedAreas,
        hasInstructor: true,
      }),
    ).toBe("/");
  });

  it("does not infer missing access from a failed organization request", () => {
    expect(
      chooseAreaDestination({
        ...resolvedAreas,
        hasOrganizationsError: true,
      }),
    ).toBeNull();
  });

  it("uses onboarding only after a successful area resolution finds no access", () => {
    expect(chooseAreaDestination(resolvedAreas)).toBe("/onboarding/academy");
  });
});
