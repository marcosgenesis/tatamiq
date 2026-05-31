import { Inject, Injectable } from "@nestjs/common";
import { AuditService, type WriteAuditEntry } from "./audit.service";

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
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  async run<T>(
    adminUserId: string,
    audit: AuditDescriptor<T>,
    command: () => Promise<T>,
  ): Promise<T> {
    const result = await command();
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
}
