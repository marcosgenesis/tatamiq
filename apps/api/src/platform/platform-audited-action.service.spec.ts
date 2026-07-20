import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { WriteAuditEntry } from "./audit.service";
import type { PlatformSession } from "./platform-admin.service";
import { PlatformAuditedActionService } from "./platform-audited-action.service";

function session(user: { id: string; role?: string | null }): PlatformSession {
  return {
    user,
    session: { id: "session-1" },
  } as PlatformSession;
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

  return {
    entries,
    auditService,
    platformAdminService,
    auditedAction: new PlatformAuditedActionService(
      auditService as never,
      platformAdminService as never,
    ),
  };
}

describe("PlatformAuditedActionService", () => {
  it("rejects non-admin sessions before executing the action", async () => {
    const { auditedAction, auditService } = service();
    const command = vi.fn().mockResolvedValue({ success: true });

    await expect(
      auditedAction.run(session({ id: "user-1", role: "user" }), command, {
        action: "platform.user.banned",
        targetType: "user",
        targetId: "target-1",
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(command).not.toHaveBeenCalled();
    expect(auditService.write).not.toHaveBeenCalled();
  });

  it("executes an admin action and writes standardized audit fields", async () => {
    const { auditedAction, entries } = service();

    const result = await auditedAction.run(
      session({ id: "admin-1", role: "admin" }),
      () => Promise.resolve({ success: true }),
      {
        action: "platform.user.banned",
        targetType: "user",
        targetId: "user-42",
        reason: "abuse",
        metadata: { source: "test" },
      },
    );

    expect(result).toEqual({ success: true });
    expect(entries).toEqual([
      {
        adminUserId: "admin-1",
        action: "platform.user.banned",
        targetType: "user",
        targetId: "user-42",
        reason: "abuse",
        metadata: { source: "test" },
      },
    ]);
  });

  it("writes a failure entry and rethrows the original command error", async () => {
    const { auditedAction, entries } = service();
    const error = new Error("Usuário não encontrado.");

    await expect(
      auditedAction.run(session({ id: "admin-1", role: "admin" }), () => Promise.reject(error), {
        action: "platform.user.banned",
        targetType: "user",
        targetId: "user-42",
        reason: "abuse",
        metadata: { source: "test" },
      }),
    ).rejects.toBe(error);

    expect(entries).toEqual([
      expect.objectContaining({
        adminUserId: "admin-1",
        action: "platform.user.banned",
        targetType: "user",
        targetId: "user-42",
        reason: "abuse",
        result: "failure",
        metadata: {
          source: "test",
          errorName: "Error",
          errorMessage: "Usuário não encontrado.",
        },
      }),
    ]);
  });

  it("writes impersonated-admin failures with the real admin id", async () => {
    const { auditedAction, entries } = service();
    const error = new Error("Remoção de responsável inválida.");

    await expect(
      auditedAction.runForImpersonatedAdmin("real-admin-1", () => Promise.reject(error), {
        action: "platform.academy.responsible_removed",
        targetType: "academy",
        academyId: "academy-1",
      }),
    ).rejects.toBe(error);

    expect(entries).toEqual([
      expect.objectContaining({
        adminUserId: "real-admin-1",
        action: "platform.academy.responsible_removed",
        targetType: "academy",
        academyId: "academy-1",
        result: "failure",
      }),
    ]);
  });

  it("does not call result-derived descriptor functions on failure", async () => {
    const { auditedAction, entries } = service();
    const targetId = vi.fn();
    const academyId = vi.fn();
    const reason = vi.fn();
    const metadata = vi.fn();

    await expect(
      auditedAction.run(
        session({ id: "admin-1", role: "admin" }),
        () => Promise.reject(new Error("Provisionamento falhou.")),
        {
          action: "platform.academy.provisioned",
          targetType: "academy",
          targetId,
          academyId,
          reason,
          metadata,
        },
      ),
    ).rejects.toThrow("Provisionamento falhou.");

    expect(targetId).not.toHaveBeenCalled();
    expect(academyId).not.toHaveBeenCalled();
    expect(reason).not.toHaveBeenCalled();
    expect(metadata).not.toHaveBeenCalled();
    expect(entries[0]).toMatchObject({
      adminUserId: "admin-1",
      action: "platform.academy.provisioned",
      targetType: "academy",
      result: "failure",
    });
    expect(entries[0]?.targetId).toBeUndefined();
    expect(entries[0]?.academyId).toBeUndefined();
    expect(entries[0]?.reason).toBeUndefined();
  });

  it("rethrows the original error when writing the failure audit rejects", async () => {
    const { auditedAction, auditService } = service();
    const commandError = new Error("Comando falhou.");
    auditService.write.mockRejectedValueOnce(new Error("Audit unavailable."));

    await expect(
      auditedAction.run(
        session({ id: "admin-1", role: "admin" }),
        () => Promise.reject(commandError),
        {
          action: "platform.user.deleted",
          targetType: "user",
          targetId: "user-42",
        },
      ),
    ).rejects.toBe(commandError);
  });

  it("supports result-derived target ids, academy ids, reason, and metadata", async () => {
    const { auditedAction, entries } = service();

    await auditedAction.run(
      session({ id: "admin-1", role: "admin" }),
      () =>
        Promise.resolve({
          academy: { id: "academy-1" },
          ownerUserId: "owner-1",
          reason: "manual provisioning",
        }),
      {
        action: "platform.academy.provisioned",
        targetType: "academy",
        targetId: (result) => result.academy.id,
        academyId: (result) => result.academy.id,
        reason: (result) => result.reason,
        metadata: (result) => ({ ownerUserId: result.ownerUserId, ownerWasCreated: true }),
      },
    );

    expect(entries[0]).toMatchObject({
      adminUserId: "admin-1",
      targetId: "academy-1",
      academyId: "academy-1",
      reason: "manual provisioning",
      metadata: { ownerUserId: "owner-1", ownerWasCreated: true },
    });
  });
});
