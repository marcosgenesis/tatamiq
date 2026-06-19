import { describe, expect, it } from "vitest";
import { platformDashboardQuery, platformMeQuery, platformUsersQuery } from "./platform-queries";

describe("platform query keys", () => {
  it("scopes platform access cache by authenticated user", () => {
    expect(platformMeQuery("admin-user").queryKey).not.toEqual(
      platformMeQuery("new-user").queryKey,
    );
    expect(platformMeQuery("admin-user").queryKey).toEqual(["platform", "me", "admin-user"]);
  });

  it("scopes platform data caches by authenticated administrator", () => {
    expect(platformDashboardQuery("admin-user").queryKey).not.toEqual(
      platformDashboardQuery("other-admin").queryKey,
    );
    expect(platformUsersQuery("admin-user", "", 0, 10).queryKey).toEqual([
      "platform",
      "users",
      "admin-user",
      "",
      0,
      10,
    ]);
  });
});
