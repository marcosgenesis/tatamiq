import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
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

type MockUser = { id: string; role?: string | null; banned?: boolean };

function createAdminGuardDb(target: MockUser | undefined, adminRows: MockUser[]) {
  let selectCalls = 0;
  return {
    select: vi.fn(() => {
      selectCalls += 1;
      const call = selectCalls;
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => {
            if (call === 1) {
              return { limit: vi.fn().mockResolvedValue(target ? [target] : []) };
            }
            return Promise.resolve(adminRows);
          }),
        })),
      };
    }),
  };
}

describe("platform admin access", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
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
  });

  it("allows disabling a non-admin user", async () => {
    const db = createAdminGuardDb({ id: "user-1", role: "user", banned: false }, []);
    const service = new PlatformAdminService(db as never);

    await expect(service.assertCanDisablePlatformUser("user-1")).resolves.toBeUndefined();
  });

  it("rejects disabling the last active role-based admin", async () => {
    const admin = { id: "admin-1", role: "admin", banned: false };
    const db = createAdminGuardDb(admin, [admin]);
    const service = new PlatformAdminService(db as never);

    await expect(service.assertCanDisablePlatformUser("admin-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects disabling a configured platform admin", async () => {
    vi.stubEnv("PLATFORM_ADMIN_USER_IDS", "configured-admin");
    const db = createAdminGuardDb({ id: "configured-admin", role: null, banned: false }, [
      { id: "configured-admin", role: null, banned: false },
      { id: "admin-1", role: "admin", banned: false },
    ]);
    const service = new PlatformAdminService(db as never);

    await expect(service.assertCanDisablePlatformUser("configured-admin")).rejects.toThrow(
      "Administrador configurado por ambiente não pode ser desativado ou excluído aqui.",
    );
  });

  it("allows disabling a non-last role-based admin", async () => {
    const db = createAdminGuardDb({ id: "admin-1", role: "admin", banned: false }, [
      { id: "admin-1", role: "admin", banned: false },
      { id: "admin-2", role: "admin", banned: false },
    ]);
    const service = new PlatformAdminService(db as never);

    await expect(service.assertCanDisablePlatformUser("admin-1")).resolves.toBeUndefined();
  });

  it("throws NotFoundException when checking an absent user", async () => {
    const db = createAdminGuardDb(undefined, []);
    const service = new PlatformAdminService(db as never);

    await expect(service.assertCanDisablePlatformUser("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
