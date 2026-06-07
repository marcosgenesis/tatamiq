import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuditService } from "./audit.service";
import { PlatformSupportService } from "./platform-support.service";

type RequestWithSession = {
  method?: string;
  originalUrl?: string;
  url?: string;
  path?: string;
  session?: {
    user?: { id?: string };
    session?: {
      id?: string;
      impersonatedBy?: string | null;
      activeOrganizationId?: string | null;
    };
  };
};

@Injectable()
export class SupportActionAuditInterceptor implements NestInterceptor {
  constructor(
    @Inject(PlatformSupportService) private readonly supportService: PlatformSupportService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    const adminUserId = request.session?.session?.impersonatedBy;
    const impersonationSessionId = request.session?.session?.id;
    const method = request.method ?? "GET";
    const path = request.originalUrl ?? request.url ?? request.path ?? "";

    if (!adminUserId || !impersonationSessionId || !shouldAuditSupportAction(method, path)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        void this.writeSupportActionAudit({
          adminUserId,
          impersonationSessionId,
          method,
          path,
        });
      }),
    );
  }

  private async writeSupportActionAudit(input: {
    adminUserId: string;
    impersonationSessionId: string;
    method: string;
    path: string;
  }) {
    const support = await this.supportService.currentSupport(input.impersonationSessionId);
    if (!support) return;

    await this.auditService.write({
      adminUserId: input.adminUserId,
      action: "platform.support.action",
      targetType: "support_session",
      targetId: support.id,
      academyId: support.academyId ?? undefined,
      metadata: {
        supportSessionId: support.id,
        targetUserId: support.targetUserId,
        impersonationSessionId: input.impersonationSessionId,
        method: input.method,
        path: input.path,
      },
    });
  }
}

export function shouldAuditSupportAction(method: string, path: string): boolean {
  if (method.toUpperCase() === "GET") return false;
  if (path.startsWith("/platform/support")) return false;
  if (path.startsWith("/health")) return false;
  return true;
}
