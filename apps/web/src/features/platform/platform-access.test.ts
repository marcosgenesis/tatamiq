import { describe, expect, it } from "vitest";
import { resolvePlatformAccess } from "./platform-queries";

const settledSuccess = (userId: string, dataUserId: string) => ({
  sessionPending: false,
  sessionUserId: userId,
  platform: {
    isPending: false,
    isFetching: false,
    isSuccess: true,
    data: { user: { id: dataUserId } },
  },
});

describe("resolvePlatformAccess", () => {
  it("allows a real admin whose /platform/me matches the current session", () => {
    expect(resolvePlatformAccess(settledSuccess("admin-1", "admin-1"))).toBe("allowed");
  });

  it("denies when the successful result belongs to a different (stale admin) identity", () => {
    // The exact bug: a new account's session with a lingering admin success.
    expect(resolvePlatformAccess(settledSuccess("new-user", "admin-1"))).toBe("denied");
  });

  it("waits (loading) while the platform query is still fetching", () => {
    expect(
      resolvePlatformAccess({
        sessionPending: false,
        sessionUserId: "new-user",
        platform: { isPending: false, isFetching: true, isSuccess: false, data: undefined },
      }),
    ).toBe("loading");
  });

  it("waits (loading) while the session is pending or has no user yet", () => {
    const platform = {
      isPending: false,
      isFetching: false,
      isSuccess: true,
      data: { user: { id: "x" } },
    };
    expect(resolvePlatformAccess({ sessionPending: true, sessionUserId: "x", platform })).toBe(
      "loading",
    );
    expect(
      resolvePlatformAccess({ sessionPending: false, sessionUserId: undefined, platform }),
    ).toBe("loading");
  });

  it("denies a non-admin whose query errored (no success)", () => {
    expect(
      resolvePlatformAccess({
        sessionPending: false,
        sessionUserId: "new-user",
        platform: { isPending: false, isFetching: false, isSuccess: false, data: undefined },
      }),
    ).toBe("denied");
  });
});
