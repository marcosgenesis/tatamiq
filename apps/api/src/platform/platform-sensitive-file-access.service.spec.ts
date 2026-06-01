import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WriteAuditEntry } from "./audit.service";
import type { PlatformSession } from "./platform-admin.service";
import { PlatformAuditedActionService } from "./platform-audited-action.service";
import { PlatformSensitiveFileAccessService } from "./platform-sensitive-file-access.service";

function session(user: { id: string; role?: string | null }): PlatformSession {
  return {
    user,
    session: { id: "session-1" },
  } as PlatformSession;
}

function receipt(overrides: Record<string, unknown> = {}) {
  return {
    id: "receipt-1",
    monthlyFeeId: "fee-1",
    organizationId: "academy-1",
    studentId: "student-1",
    fileKey: "receipts/academy-1/fee-1/file-1",
    fileUrl: null,
    fileType: "application/pdf",
    fileSizeBytes: 123_456,
    note: null,
    status: "pending",
    rejectionReason: null,
    replacedAt: null,
    createdByUserId: "student-user-1",
    createdAt: new Date("2026-05-31T12:00:00.000Z"),
    ...overrides,
  };
}

function service() {
  const entries: WriteAuditEntry[] = [];
  const auditService = {
    write: vi.fn().mockImplementation((entry: WriteAuditEntry) => {
      entries.push(entry);
      return Promise.resolve();
    }),
  };
  const platformAdminService = {
    assertPlatformAdmin: vi.fn().mockImplementation((input: PlatformSession) => {
      if (input.user.role !== "admin") {
        throw new ForbiddenException("Acesso restrito a Administradores da Plataforma.");
      }
      return { isAdmin: true, user: { ...input.user, name: null, email: null, image: null } };
    }),
  };
  const platformAcademyService = {
    getReceipt: vi.fn().mockResolvedValue(receipt()),
  };
  const r2 = {
    generateReadUrl: vi.fn().mockResolvedValue("https://signed.example/read"),
    getPublicUrl: vi.fn(),
  };
  const auditedAction = new PlatformAuditedActionService(
    auditService as never,
    platformAdminService as never,
  );

  return {
    entries,
    auditService,
    platformAcademyService,
    r2,
    sensitiveFileAccess: new PlatformSensitiveFileAccessService(
      auditedAction,
      platformAcademyService as never,
      r2 as never,
    ),
  };
}

describe("PlatformSensitiveFileAccessService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects non-admin sessions before looking up or signing private files", async () => {
    const { sensitiveFileAccess, auditService, platformAcademyService, r2 } = service();

    await expect(
      sensitiveFileAccess.receiptViewUrl(
        session({ id: "user-1", role: "user" }),
        "academy-1",
        "receipt-1",
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(platformAcademyService.getReceipt).not.toHaveBeenCalled();
    expect(r2.generateReadUrl).not.toHaveBeenCalled();
    expect(auditService.write).not.toHaveBeenCalled();
  });

  it("returns the same short-lived signed URL shape for platform admins", async () => {
    const { sensitiveFileAccess, r2 } = service();

    await expect(
      sensitiveFileAccess.receiptViewUrl(
        session({ id: "admin-1", role: "admin" }),
        "academy-1",
        "receipt-1",
      ),
    ).resolves.toEqual({
      viewUrl: "https://signed.example/read",
      expiresAt: "2026-06-01T10:05:00.000Z",
    });

    expect(r2.generateReadUrl).toHaveBeenCalledWith("receipts/academy-1/fee-1/file-1", 300);
  });

  it("writes administrative audit with actor, action, target, result, academy, and file metadata", async () => {
    const { sensitiveFileAccess, entries } = service();

    await sensitiveFileAccess.receiptViewUrl(
      session({ id: "admin-1", role: "admin" }),
      "academy-1",
      "receipt-1",
    );

    expect(entries).toEqual([
      {
        adminUserId: "admin-1",
        action: "platform.sensitive_file.accessed",
        targetType: "payment_receipt",
        targetId: "receipt-1",
        academyId: "academy-1",
        result: "success",
        metadata: {
          fileKey: "receipts/academy-1/fee-1/file-1",
          fileType: "application/pdf",
          fileSizeBytes: 123_456,
          monthlyFeeId: "fee-1",
          receiptStatus: "pending",
          studentId: "student-1",
          expiresInSeconds: 300,
        },
      },
    ]);
  });

  it("does not make private files public or persist long-lived URLs", async () => {
    const { sensitiveFileAccess, r2 } = service();

    await sensitiveFileAccess.receiptViewUrl(
      session({ id: "admin-1", role: "admin" }),
      "academy-1",
      "receipt-1",
    );

    expect(r2.getPublicUrl).not.toHaveBeenCalled();
  });

  it("does not sign or audit missing receipts", async () => {
    const { sensitiveFileAccess, auditService, platformAcademyService, r2 } = service();
    platformAcademyService.getReceipt.mockResolvedValueOnce(null);

    await expect(
      sensitiveFileAccess.receiptViewUrl(
        session({ id: "admin-1", role: "admin" }),
        "academy-1",
        "missing-receipt",
      ),
    ).rejects.toThrow(NotFoundException);

    expect(r2.generateReadUrl).not.toHaveBeenCalled();
    expect(auditService.write).not.toHaveBeenCalled();
  });
});
