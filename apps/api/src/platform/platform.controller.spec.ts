import { describe, expect, it, vi } from "vitest";
import { PlatformController } from "./platform.controller";

type AuditDescriptor = {
  action: string;
  targetType: string;
  targetId?: string | ((result: unknown) => string | undefined);
  academyId?: string | ((result: unknown) => string | undefined);
  reason?: string | ((result: unknown) => string | undefined);
  metadata?: Record<string, unknown> | ((result: unknown) => Record<string, unknown> | undefined);
};

const adminSession = {
  user: { id: "admin-1", role: "admin" },
  session: { id: "session-1" },
};

function resolveTargetId(audit: AuditDescriptor, result: unknown) {
  return typeof audit.targetId === "function" ? audit.targetId(result) : audit.targetId;
}

function resolveMetadata(audit: AuditDescriptor, result: unknown) {
  return typeof audit.metadata === "function" ? audit.metadata(result) : audit.metadata;
}

function createController() {
  const auditedDescriptors: AuditDescriptor[] = [];
  const impersonatedDescriptors: { adminUserId: string; audit: AuditDescriptor }[] = [];
  const platformAcademyService = {
    dashboard: vi.fn(),
    listAcademies: vi.fn(),
    getAcademy: vi.fn(),
    getAcademyOperationalOverview: vi.fn(),
    provisionAcademy: vi.fn().mockResolvedValue({
      academy: { id: "academy-1" },
      ownerUserId: "owner-1",
      ownerWasCreated: true,
    }),
    transferAcademy: vi.fn().mockResolvedValue({
      academy: { id: "academy-1" },
      ownerUserId: "owner-2",
      ownerWasCreated: false,
    }),
    addResponsible: vi.fn().mockResolvedValue({
      academy: { id: "academy-1" },
      ownerUserId: "owner-3",
      ownerWasCreated: false,
    }),
    removeResponsible: vi.fn().mockResolvedValue({ success: true }),
  };
  const academyDeletionService = {
    preview: vi.fn().mockResolvedValue({ academy: { id: "academy-1" } }),
    delete: vi.fn().mockResolvedValue({
      success: true,
      deletedAcademyId: "academy-1",
      deletedAcademyName: "Tatame Centro",
      deletedAcademySlug: "tatame-centro",
      impact: {
        students: 0,
        classGroups: 0,
        classSessions: 0,
        attendances: 0,
        monthlyFees: 0,
        paymentReceipts: 0,
        preRegistrationRequests: 0,
        files: 0,
      },
      deletedFiles: 0,
      affectedResponsibles: [],
    }),
  };
  const platformAdminService = {
    assertPlatformAdmin: vi.fn().mockReturnValue({
      isAdmin: true,
      user: { id: "admin-1", name: null, email: null, image: null },
    }),
    listAdministrators: vi.fn(),
    addAdministrator: vi.fn().mockResolvedValue({
      administrator: { id: "target-admin-1" },
      userWasCreated: true,
    }),
    removeAdministrator: vi.fn().mockResolvedValue({ success: true }),
  };
  const platformUserService = {
    listUsers: vi.fn(),
    getUser: vi.fn(),
    banUser: vi.fn().mockResolvedValue({ success: true }),
    unbanUser: vi.fn().mockResolvedValue({ success: true }),
    revokeUserSessions: vi.fn().mockResolvedValue({ success: true }),
  };
  const userDeletionService = {
    impact: vi.fn(),
    delete: vi.fn().mockResolvedValue({ success: true }),
  };
  const platformSupportService = {
    prepareSupport: vi.fn().mockResolvedValue({
      id: "support-1",
      targetUserId: "user-1",
      academyId: "academy-1",
      reason: "debug customer issue",
      expiresAt: "2026-06-01T11:00:00.000Z",
    }),
    activateSupport: vi.fn(),
    currentSupport: vi.fn(),
    endSupport: vi.fn().mockResolvedValue({
      id: "support-1",
      targetUserId: "user-1",
      academyId: "academy-1",
      reason: "debug customer issue",
    }),
  };
  const auditedAction = {
    run: vi.fn().mockImplementation(async (_session, command, audit: AuditDescriptor) => {
      auditedDescriptors.push(audit);
      return command({ user: { id: "admin-1" } });
    }),
    runForImpersonatedAdmin: vi
      .fn()
      .mockImplementation(async (adminUserId, command, audit: AuditDescriptor) => {
        impersonatedDescriptors.push({ adminUserId, audit });
        return command();
      }),
  };

  return {
    auditedDescriptors,
    impersonatedDescriptors,
    platformAcademyService,
    academyDeletionService,
    platformAdminService,
    platformUserService,
    userDeletionService,
    platformSupportService,
    controller: new PlatformController(
      platformAdminService as never,
      platformAcademyService as never,
      academyDeletionService as never,
      platformSupportService as never,
      platformUserService as never,
      userDeletionService as never,
      {} as never,
      auditedAction as never,
      {} as never,
      {} as never,
    ),
  };
}

describe("PlatformController audited action seams", () => {
  it("routes academy provisioning and responsible changes through administrative audit descriptors", async () => {
    const { controller, auditedDescriptors } = createController();

    await controller.provisionAcademy(
      adminSession as never,
      {
        academyName: "Tatame Centro",
        ownerEmail: "owner@example.com",
        ownerName: "Owner",
      } as never,
    );
    await controller.transferAcademy(adminSession as never, "academy-1", {
      ownerEmail: "new-owner@example.com",
      ownerName: "New Owner",
    } as never);
    await controller.addResponsible(adminSession as never, "academy-1", {
      ownerEmail: "extra@example.com",
      ownerName: "Extra",
    } as never);
    await controller.removeResponsible(adminSession as never, "academy-1", "owner-3", {
      allowLeavingOwnerless: true,
    } as never);

    expect(auditedDescriptors[0]).toMatchObject({
      action: "platform.academy.provisioned",
      targetType: "academy",
    });
    expect(resolveTargetId(auditedDescriptors[0]!, { academy: { id: "academy-1" } })).toBe(
      "academy-1",
    );
    expect(
      resolveMetadata(auditedDescriptors[0]!, { ownerUserId: "owner-1", ownerWasCreated: true }),
    ).toEqual({
      ownerUserId: "owner-1",
      ownerWasCreated: true,
    });
    expect(auditedDescriptors[1]).toMatchObject({
      action: "platform.academy.transferred",
      targetType: "academy",
      targetId: "academy-1",
      academyId: "academy-1",
    });
    expect(auditedDescriptors[2]).toMatchObject({
      action: "platform.academy.responsible_added",
      targetType: "academy",
      targetId: "academy-1",
      academyId: "academy-1",
    });
    expect(auditedDescriptors[3]).toMatchObject({
      action: "platform.academy.responsible_removed",
      targetType: "academy",
      targetId: "academy-1",
      academyId: "academy-1",
    });
  });

  it("routes academy deletion through administrative audit with deleted academy metadata", async () => {
    const { controller, auditedDescriptors } = createController();

    await controller.deleteAcademy(adminSession as never, "academy-1", {
      confirmationSlug: "tatame-centro",
      irreversibleAccepted: true,
      reason: "cleanup test academy",
    } as never);

    expect(auditedDescriptors[0]).toMatchObject({
      action: "platform.academy.deleted",
      targetType: "academy",
      targetId: "academy-1",
    });
    expect(auditedDescriptors[0]?.academyId).toBeUndefined();
    expect(
      resolveMetadata(auditedDescriptors[0]!, {
        deletedAcademyId: "academy-1",
        deletedAcademyName: "Tatame Centro",
        deletedAcademySlug: "tatame-centro",
        impact: { students: 0 },
        deletedFiles: 0,
        affectedResponsibles: [],
      }),
    ).toEqual({
      deletedAcademyId: "academy-1",
      deletedAcademyName: "Tatame Centro",
      deletedAcademySlug: "tatame-centro",
      impact: { students: 0 },
      deletedFiles: 0,
      affectedResponsibles: [],
    });
  });

  it("routes platform user administrative actions through administrative audit descriptors", async () => {
    const { controller, auditedDescriptors } = createController();

    await controller.banUser(adminSession as never, "user-1", { reason: "abuse" } as never);
    await controller.unbanUser(adminSession as never, "user-1");
    await controller.revokeUserSessions(adminSession as never, "user-1");
    await controller.deleteUser(adminSession as never, "user-1", {
      mode: "preserve_history",
      ownerResolution: "transfer_academies",
    } as never);

    expect(auditedDescriptors.map((audit) => audit.action)).toEqual([
      "platform.user.banned",
      "platform.user.unbanned",
      "platform.user.sessions_revoked",
      "platform.user.deleted_preserving_history",
    ]);
    expect(auditedDescriptors.every((audit) => audit.targetType === "user")).toBe(true);
    expect(auditedDescriptors[3]?.metadata).toEqual({
      mode: "preserve_history",
      ownerResolution: "transfer_academies",
    });
  });

  it("routes platform administrator management through administrative audit descriptors", async () => {
    const { controller, auditedDescriptors } = createController();

    await controller.addAdministrator(
      adminSession as never,
      {
        email: "admin2@example.com",
        name: "Admin Two",
      } as never,
    );
    await controller.removeAdministrator(adminSession as never, "target-admin-1");

    expect(auditedDescriptors[0]).toMatchObject({
      action: "platform.admin.added",
      targetType: "user",
    });
    expect(
      resolveTargetId(auditedDescriptors[0]!, { administrator: { id: "target-admin-1" } }),
    ).toBe("target-admin-1");
    expect(resolveMetadata(auditedDescriptors[0]!, { userWasCreated: true })).toEqual({
      userWasCreated: true,
    });
    expect(auditedDescriptors[1]).toMatchObject({
      action: "platform.admin.removed",
      targetType: "user",
      targetId: "target-admin-1",
    });
  });

  it("keeps support audit descriptors explicit and tied to the real admin during impersonation", async () => {
    const { controller, auditedDescriptors, impersonatedDescriptors } = createController();

    await controller.startSupport(
      adminSession as never,
      { targetUserId: "user-1", academyId: "academy-1", reason: "debug customer issue" } as never,
      { ip: "127.0.0.1", headers: { "user-agent": "vitest" } },
    );
    await controller.endSupport({
      user: { id: "user-1", role: "user" },
      session: { id: "impersonated-session-1", impersonatedBy: "admin-1" },
    } as never);

    expect(auditedDescriptors[0]).toMatchObject({
      action: "platform.support.started",
      targetType: "user",
      targetId: "user-1",
      academyId: "academy-1",
      reason: "debug customer issue",
    });
    expect(impersonatedDescriptors[0]?.adminUserId).toBe("admin-1");
    expect(impersonatedDescriptors[0]?.audit).toMatchObject({
      action: "platform.support.ended",
      targetType: "user",
      targetId: "user-1",
    });
    expect(resolveMetadata(impersonatedDescriptors[0]!.audit, { id: "support-1" })).toEqual({
      supportSessionId: "support-1",
      impersonationSessionId: "impersonated-session-1",
    });
  });
});
