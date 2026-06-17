import { Inject, Injectable } from "@nestjs/common";
import { AuditService, type WriteAuditEntry } from "./audit.service";
import {
  PlatformAdminService,
  type PlatformMe,
  type PlatformSession,
} from "./platform-admin.service";

type AsyncCommand<T> = () => Promise<T>;
type AdminCommand<T> = (admin: PlatformMe) => Promise<T>;

type AuditDescriptor<T> = Omit<
  WriteAuditEntry,
  "adminUserId" | "targetId" | "academyId" | "reason" | "metadata"
> & {
  targetId?: string | ((result: T) => string | undefined);
  academyId?: string | ((result: T) => string | undefined);
  reason?: string | ((result: T) => string | undefined);
  metadata?: Record<string, unknown> | ((result: T) => Record<string, unknown> | undefined);
};

@Injectable()
export class PlatformAuditedActionService {
  constructor(
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(PlatformAdminService) private readonly platformAdminService: PlatformAdminService,
  ) {}

  async run<T>(
    session: PlatformSession,
    command: AdminCommand<T>,
    audit: AuditDescriptor<T>,
  ): Promise<T> {
    const admin = this.platformAdminService.assertPlatformAdmin(session);
    return this.writeAudit(admin.user.id, command(admin), audit);
  }

  async runForImpersonatedAdmin<T>(
    adminUserId: string,
    command: AsyncCommand<T>,
    audit: AuditDescriptor<T>,
  ): Promise<T> {
    return this.writeAudit(adminUserId, command(), audit);
  }

  private async writeAudit<T>(
    adminUserId: string,
    resultPromise: Promise<T>,
    audit: AuditDescriptor<T>,
  ): Promise<T> {
    let result: T;
    try {
      result = await resultPromise;
    } catch (error) {
      await this.writeFailureAudit(adminUserId, audit, error);
      throw error;
    }

    await this.auditService.write({
      ...audit,
      adminUserId,
      targetId: typeof audit.targetId === "function" ? audit.targetId(result) : audit.targetId,
      academyId: typeof audit.academyId === "function" ? audit.academyId(result) : audit.academyId,
      reason: typeof audit.reason === "function" ? audit.reason(result) : audit.reason,
      metadata: typeof audit.metadata === "function" ? audit.metadata(result) : audit.metadata,
    });
    return result;
  }

  private async writeFailureAudit<T>(
    adminUserId: string,
    audit: AuditDescriptor<T>,
    error: unknown,
  ): Promise<void> {
    try {
      await this.auditService.write({
        ...audit,
        adminUserId,
        result: "failure",
        targetId: typeof audit.targetId === "function" ? undefined : audit.targetId,
        academyId: typeof audit.academyId === "function" ? undefined : audit.academyId,
        reason: typeof audit.reason === "function" ? undefined : audit.reason,
        metadata: failureMetadata(error, audit.metadata),
      });
    } catch {
      // Preserve the original command error when failure-audit persistence itself fails.
    }
  }
}

function failureMetadata<T>(
  error: unknown,
  descriptorMetadata: AuditDescriptor<T>["metadata"],
): Record<string, unknown> {
  const staticMetadata = typeof descriptorMetadata === "function" ? undefined : descriptorMetadata;
  return {
    ...staticMetadata,
    errorName: error instanceof Error ? error.name : "Error",
    errorMessage: error instanceof Error ? error.message : "Ação administrativa falhou.",
  };
}
