import type { ExecutionContext } from "@nestjs/common";
import { lastValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import {
  SupportActionAuditInterceptor,
  shouldAuditSupportAction,
} from "./support-action-audit.interceptor";

function contextFor(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe("SupportActionAuditInterceptor", () => {
  it("ignores reads and platform support lifecycle routes", () => {
    expect(shouldAuditSupportAction("GET", "/students")).toBe(false);
    expect(shouldAuditSupportAction("POST", "/platform/support/end")).toBe(false);
    expect(shouldAuditSupportAction("POST", "/students/123/notes")).toBe(true);
  });

  it("writes a support action audit after an assisted mutating action succeeds", async () => {
    const supportService = {
      currentSupport: vi.fn().mockResolvedValue({
        id: "support-1",
        targetUserId: "user-1",
        academyId: "academy-1",
      }),
    };
    const auditService = { write: vi.fn().mockResolvedValue(undefined) };
    const interceptor = new SupportActionAuditInterceptor(
      supportService as never,
      auditService as never,
    );

    await lastValueFrom(
      interceptor.intercept(
        contextFor({
          method: "POST",
          originalUrl: "/students/123/notes",
          session: {
            session: { id: "impersonation-session-1", impersonatedBy: "admin-1" },
            user: { id: "user-1" },
          },
        }),
        { handle: () => of({ success: true }) },
      ),
    );

    await vi.waitFor(() => expect(auditService.write).toHaveBeenCalled());
    expect(auditService.write).toHaveBeenCalledWith({
      adminUserId: "admin-1",
      action: "platform.support.action",
      targetType: "support_session",
      targetId: "support-1",
      academyId: "academy-1",
      metadata: {
        supportSessionId: "support-1",
        targetUserId: "user-1",
        impersonationSessionId: "impersonation-session-1",
        method: "POST",
        path: "/students/123/notes",
      },
    });
  });

  it("does not write support action audit when the request is not impersonated", async () => {
    const supportService = { currentSupport: vi.fn() };
    const auditService = { write: vi.fn() };
    const interceptor = new SupportActionAuditInterceptor(
      supportService as never,
      auditService as never,
    );

    await lastValueFrom(
      interceptor.intercept(contextFor({ method: "POST", originalUrl: "/students" }), {
        handle: () => of({ success: true }),
      }),
    );

    expect(supportService.currentSupport).not.toHaveBeenCalled();
    expect(auditService.write).not.toHaveBeenCalled();
  });
});
