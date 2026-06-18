import { describe, expect, it } from "vitest";
import { platformMeQuery } from "./platform-queries";

describe("platformMeQuery", () => {
  it("scopes platform access cache by authenticated user", () => {
    expect(platformMeQuery("admin-user").queryKey).not.toEqual(
      platformMeQuery("new-user").queryKey,
    );
    expect(platformMeQuery("admin-user").queryKey).toEqual(["platform", "me", "admin-user"]);
  });
});
