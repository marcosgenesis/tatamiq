import { BadRequestException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlatformSupportService } from "./platform-support.service";

function createSupportDb(selectRows: unknown[][]) {
  let selectIndex = 0;
  const insertValues = vi.fn();
  const db = {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => Promise.resolve(selectRows[selectIndex++] ?? [])),
        }),
      }),
    })),
    insert: vi.fn().mockReturnValue({ values: insertValues }),
  };
  return { db, insertValues };
}

describe("PlatformSupportService", () => {
  afterEach(() => {
    delete process.env.PLATFORM_ADMIN_USER_IDS;
    delete process.env.BETTER_AUTH_ADMIN_USER_IDS;
  });

  it("rejects support targeting a role-based platform administrator", async () => {
    const { db, insertValues } = createSupportDb([[{ id: "target-admin", role: "admin" }]]);
    const service = new PlatformSupportService(db as never);

    await expect(
      service.prepareSupport({ adminUserId: "admin-1", targetUserId: "target-admin" }),
    ).rejects.toThrow(BadRequestException);

    expect(insertValues).not.toHaveBeenCalled();
  });

  it("rejects support targeting a configured platform administrator", async () => {
    process.env.PLATFORM_ADMIN_USER_IDS = "configured-admin";
    const { db, insertValues } = createSupportDb([[{ id: "configured-admin", role: null }]]);
    const service = new PlatformSupportService(db as never);

    await expect(
      service.prepareSupport({ adminUserId: "admin-1", targetUserId: "configured-admin" }),
    ).rejects.toThrow("Suporte Assistido não pode mirar outro Administrador da Plataforma.");

    expect(insertValues).not.toHaveBeenCalled();
  });

  it("rejects support targeting a user without an operational area", async () => {
    const { db, insertValues } = createSupportDb([[{ id: "target-user", role: null }], [], []]);
    const service = new PlatformSupportService(db as never);

    await expect(
      service.prepareSupport({ adminUserId: "admin-1", targetUserId: "target-user" }),
    ).rejects.toThrow("Suporte Assistido exige uma conta com área operacional disponível.");

    expect(insertValues).not.toHaveBeenCalled();
  });

  it("allows support targeting a user with an instructor area", async () => {
    const { db, insertValues } = createSupportDb([
      [{ id: "target-user", role: null, name: "Target", email: "target@test.com" }],
      [{ id: "member-1" }],
      [],
    ]);
    const service = new PlatformSupportService(db as never);

    await expect(
      service.prepareSupport({ adminUserId: "admin-1", targetUserId: "target-user" }),
    ).resolves.toMatchObject({ targetUserId: "target-user" });

    expect(insertValues).toHaveBeenCalledOnce();
  });
});
