import { Inject, Injectable } from "@nestjs/common";
import { adminAuditLogs, type Database, user } from "@tatamiq/database";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { DATABASE } from "../database/database.module";

export type AuditAction =
  | "platform.dashboard.viewed"
  | "platform.academy.provisioned"
  | "platform.academy.transferred"
  | "platform.academy.responsible_added"
  | "platform.academy.responsible_removed"
  | "platform.user.banned"
  | "platform.user.unbanned"
  | "platform.user.sessions_revoked"
  | "platform.user.deleted"
  | "platform.user.deleted_preserving_history"
  | "platform.admin.added"
  | "platform.admin.removed"
  | "platform.first_access_link.generated"
  | "platform.first_access_link.regenerated"
  | "platform.sensitive_file.accessed"
  | "platform.support.started"
  | "platform.support.activated"
  | "platform.support.ended"
  | "platform.support.action";

export type WriteAuditEntry = {
  adminUserId: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  result?: "success" | "failure";
  reason?: string;
  metadata?: Record<string, unknown>;
  academyId?: string;
};

export type AuditLogEntry = {
  id: string;
  adminUserId: string;
  adminName: string | null;
  adminEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  result: string;
  reason: string | null;
  metadata: unknown;
  academyId: string | null;
  createdAt: string;
};

export type AuditListFilters = {
  action?: string;
  adminUserId?: string;
  academyId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class AuditService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async write(entry: WriteAuditEntry): Promise<void> {
    const id = crypto.randomUUID();
    await this.db.insert(adminAuditLogs).values({
      id,
      adminUserId: entry.adminUserId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      result: entry.result ?? "success",
      reason: entry.reason ?? null,
      metadata: entry.metadata ?? null,
      academyId: entry.academyId ?? null,
    });
  }

  async list(filters: AuditListFilters = {}) {
    const page = Math.max(0, filters.page ?? 0);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));

    const conditions = [];
    if (filters.action) conditions.push(eq(adminAuditLogs.action, filters.action));
    if (filters.adminUserId) conditions.push(eq(adminAuditLogs.adminUserId, filters.adminUserId));
    if (filters.academyId) conditions.push(eq(adminAuditLogs.academyId, filters.academyId));
    if (filters.from) conditions.push(gte(adminAuditLogs.createdAt, new Date(filters.from)));
    if (filters.to) conditions.push(lte(adminAuditLogs.createdAt, new Date(filters.to)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          log: adminAuditLogs,
          adminName: user.name,
          adminEmail: user.email,
        })
        .from(adminAuditLogs)
        .leftJoin(user, eq(adminAuditLogs.adminUserId, user.id))
        .where(where)
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(pageSize)
        .offset(page * pageSize),
      this.db.select({ total: count() }).from(adminAuditLogs).where(where),
    ]);

    return {
      items: rows.map(
        (row): AuditLogEntry => ({
          id: row.log.id,
          adminUserId: row.log.adminUserId,
          adminName: row.adminName,
          adminEmail: row.adminEmail,
          action: row.log.action,
          targetType: row.log.targetType,
          targetId: row.log.targetId,
          result: row.log.result,
          reason: row.log.reason,
          metadata: row.log.metadata,
          academyId: row.log.academyId,
          createdAt: row.log.createdAt.toISOString(),
        }),
      ),
      pagination: {
        page,
        pageSize,
        total: total ?? 0,
        totalPages: Math.ceil((total ?? 0) / pageSize),
      },
    };
  }
}
