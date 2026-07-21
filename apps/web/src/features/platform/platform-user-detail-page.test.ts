import { describe, expect, it } from "vitest";
import {
  canSubmitPlatformUserDeletion,
  isSupportBlockedForPlatformUser,
  platformDeletionRequiresOwnerlessDecision,
} from "./platform-user-detail-page";

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

describe("platform user deletion helpers", () => {
  it("requires an ownerless decision only for sole-responsible academies", () => {
    expect(
      platformDeletionRequiresOwnerlessDecision({
        ownedAcademies: [{ id: "a1", name: "Tatame", slug: "tatame", isOnlyOwner: false }],
      }),
    ).toBe(false);
    expect(
      platformDeletionRequiresOwnerlessDecision({
        ownedAcademies: [{ id: "a1", name: "Tatame", slug: "tatame", isOnlyOwner: true }],
      }),
    ).toBe(true);
  });

  it("allows multi-responsible deletion without transfer-style resolution", () => {
    expect(
      canSubmitPlatformUserDeletion({
        blocksUserDestructiveActions: false,
        isPending: false,
        requiresOwnerlessDecision: false,
      }),
    ).toBe(true);
  });

  it("requires explicit Sem responsável confirmation for sole-responsible deletion", () => {
    expect(
      canSubmitPlatformUserDeletion({
        blocksUserDestructiveActions: false,
        isPending: false,
        requiresOwnerlessDecision: true,
        confirmLeaveOwnerless: true,
      }),
    ).toBe(false);
    expect(
      canSubmitPlatformUserDeletion({
        blocksUserDestructiveActions: false,
        isPending: false,
        requiresOwnerlessDecision: true,
        ownerResolution: "keep_ownerless",
        confirmLeaveOwnerless: true,
      }),
    ).toBe(true);
  });
});
