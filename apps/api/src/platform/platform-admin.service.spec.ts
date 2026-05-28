import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import {
  isPlatformAdminUser,
  PlatformAdminService,
  type PlatformSession,
} from "./platform-admin.service";

function session(user: { id: string; role?: string | null }): PlatformSession {
  return {
    user,
    session: {},
  } as PlatformSession;
}

describe("platform admin access", () => {
  it("accepts users with the global admin role", () => {
    expect(isPlatformAdminUser({ id: "user-1", role: "admin" }, [])).toBe(true);
  });

  it("accepts configured admin user ids", () => {
    expect(isPlatformAdminUser({ id: "configured-admin", role: null }, ["configured-admin"])).toBe(
      true,
    );
  });

  it("rejects normal users", () => {
    expect(isPlatformAdminUser({ id: "user-1", role: "user" }, ["other-admin"])).toBe(false);
  });

  it("does not depend on activeOrganizationId", () => {
    vi.stubEnv("PLATFORM_ADMIN_USER_IDS", "configured-admin");
    const service = new PlatformAdminService();

    const result = service.assertPlatformAdmin(session({ id: "configured-admin" }));

    expect(result.isAdmin).toBe(true);
    expect(result.user.id).toBe("configured-admin");
    vi.unstubAllEnvs();
  });

  it("throws ForbiddenException for non-admin sessions", () => {
    vi.stubEnv("PLATFORM_ADMIN_USER_IDS", "configured-admin");
    const service = new PlatformAdminService();

    expect(() => service.assertPlatformAdmin(session({ id: "normal-user" }))).toThrow(
      ForbiddenException,
    );
    vi.unstubAllEnvs();
  });
});
