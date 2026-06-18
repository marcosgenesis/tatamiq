import { describe, expect, it } from "vitest";
import { isSupportBlockedForPlatformUser } from "./platform-user-detail-page";

describe("isSupportBlockedForPlatformUser", () => {
  it("blocks role-based platform administrators", () => {
    expect(isSupportBlockedForPlatformUser({ role: "admin" })).toBe(true);
  });

  it("blocks configured platform administrators even when their role is not admin", () => {
    expect(isSupportBlockedForPlatformUser({ role: null, isPlatformAdmin: true })).toBe(true);
  });

  it("allows ordinary users", () => {
    expect(isSupportBlockedForPlatformUser({ role: "user", isPlatformAdmin: false })).toBe(false);
  });
});
