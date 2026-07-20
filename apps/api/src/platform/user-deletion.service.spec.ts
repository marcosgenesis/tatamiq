import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { type UserDeletionImpact, UserDeletionService } from "./user-deletion.service";

function createDbMock() {
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  return {
    deleteWhere,
    updateWhere,
    updateSet,
    db: {
      delete: vi.fn(() => ({ where: deleteWhere })),
      update: vi.fn(() => ({ set: updateSet })),
    },
  };
}

function createService(impact: UserDeletionImpact) {
  const dbMock = createDbMock();
  const academyOwnership = {
    keepOwnerless: vi.fn().mockResolvedValue(undefined),
    removeResponsibleLinksForUser: vi.fn().mockResolvedValue(undefined),
  };
  const platformAdmins = {
    assertCanDisablePlatformUser: vi.fn().mockResolvedValue(undefined),
  };
  const service = new UserDeletionService(
    dbMock.db as never,
    academyOwnership as never,
    platformAdmins as never,
  );
  vi.spyOn(service, "impact").mockResolvedValue(impact);

  return { service, dbMock, academyOwnership, platformAdmins };
}

function impact(overrides: Partial<UserDeletionImpact> = {}): UserDeletionImpact {
  return {
    userId: "user-1",
    memberships: 0,
    ownedAcademies: [],
    studentAccessLinks: 0,
    activeSessions: 0,
    isPlatformAdmin: false,
    ...overrides,
  };
}

describe("UserDeletionService", () => {
  it("removes only the deleted user's responsible links for multi-responsible academies", async () => {
    const { service, academyOwnership } = createService(
      impact({
        ownedAcademies: [{ id: "academy-1", name: "Tatame", slug: "tatame", isOnlyOwner: false }],
      }),
    );

    await service.delete("user-1", { mode: "preserve_history" });

    expect(academyOwnership.keepOwnerless).not.toHaveBeenCalled();
    expect(academyOwnership.removeResponsibleLinksForUser).toHaveBeenCalledWith("user-1");
  });

  it("requires an explicit sem responsável decision for sole-responsible academies", async () => {
    const { service, academyOwnership } = createService(
      impact({
        ownedAcademies: [{ id: "academy-1", name: "Tatame", slug: "tatame", isOnlyOwner: true }],
      }),
    );

    await expect(service.delete("user-1", { mode: "preserve_history" })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(academyOwnership.keepOwnerless).not.toHaveBeenCalled();
    expect(academyOwnership.removeResponsibleLinksForUser).not.toHaveBeenCalled();
  });

  it("leaves a sole-responsible academy sem responsável after confirmation", async () => {
    const { service, academyOwnership } = createService(
      impact({
        ownedAcademies: [{ id: "academy-1", name: "Tatame", slug: "tatame", isOnlyOwner: true }],
      }),
    );

    await service.delete("user-1", {
      mode: "definitive",
      ownerResolution: "keep_ownerless",
      confirmLeaveOwnerless: true,
    });

    expect(academyOwnership.keepOwnerless).toHaveBeenCalledWith("academy-1", "user-1");
    expect(academyOwnership.removeResponsibleLinksForUser).toHaveBeenCalledWith("user-1");
  });

  it("preserves or definitively deletes the account according to the selected mode", async () => {
    const preserve = createService(impact());
    await preserve.service.delete("user-1", { mode: "preserve_history" });
    expect(preserve.dbMock.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Usuário excluído",
        email: "deleted+user-1@tatamiq.local",
        banned: true,
      }),
    );

    const definitive = createService(impact());
    await definitive.service.delete("user-1", { mode: "definitive" });
    expect(definitive.dbMock.updateSet).not.toHaveBeenCalled();
    expect(definitive.dbMock.db.delete).toHaveBeenCalledTimes(2);
  });
});
