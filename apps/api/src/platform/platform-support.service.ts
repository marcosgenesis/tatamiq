import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { type Database, organization, platformSupportSessions, user } from "@tatamiq/database";
import { eq } from "drizzle-orm";
import { platformAdminUserIds } from "../auth";
import { DATABASE } from "../database/database.module";
import { isPlatformAdminUser } from "./platform-admin.service";

@Injectable()
export class PlatformSupportService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async prepareSupport(input: {
    adminUserId: string;
    targetUserId: string;
    academyId?: string;
    reason?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const [target] = await this.db
      .select()
      .from(user)
      .where(eq(user.id, input.targetUserId))
      .limit(1);
    if (!target) throw new NotFoundException("Usuário não encontrado.");
    if (isPlatformAdminUser(target, platformAdminUserIds())) {
      throw new BadRequestException(
        "Suporte Assistido não pode mirar outro Administrador da Plataforma.",
      );
    }

    if (input.academyId) {
      const [academy] = await this.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.id, input.academyId))
        .limit(1);
      if (!academy) throw new NotFoundException("Academia não encontrada.");
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    const id = crypto.randomUUID();
    await this.db.insert(platformSupportSessions).values({
      id,
      adminUserId: input.adminUserId,
      targetUserId: input.targetUserId,
      academyId: input.academyId ?? null,
      reason: input.reason ?? null,
      status: "pending",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      startedAt: now,
      expiresAt,
    });

    return {
      id,
      targetUserId: input.targetUserId,
      targetName: target.name,
      targetEmail: target.email,
      academyId: input.academyId ?? null,
      reason: input.reason ?? null,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async activateSupport(input: {
    supportSessionId: string;
    adminUserId: string;
    targetUserId: string;
    impersonationSessionId: string;
  }) {
    const [support] = await this.db
      .select()
      .from(platformSupportSessions)
      .where(eq(platformSupportSessions.id, input.supportSessionId))
      .limit(1);
    if (!support) throw new NotFoundException("Sessão de suporte não encontrada.");
    if (support.adminUserId !== input.adminUserId || support.targetUserId !== input.targetUserId) {
      throw new BadRequestException("Sessão de suporte não pertence a esta impersonação.");
    }
    if (support.expiresAt <= new Date()) {
      throw new BadRequestException("Sessão de suporte expirada.");
    }

    const activatedAt = new Date();
    await this.db
      .update(platformSupportSessions)
      .set({
        status: "active",
        activatedAt,
        impersonationSessionId: input.impersonationSessionId,
      })
      .where(eq(platformSupportSessions.id, input.supportSessionId));

    return this.supportDto({
      ...support,
      status: "active",
      activatedAt,
      impersonationSessionId: input.impersonationSessionId,
    });
  }

  async currentSupport(impersonationSessionId?: string | null) {
    if (!impersonationSessionId) return null;
    const [support] = await this.db
      .select({ support: platformSupportSessions, admin: user })
      .from(platformSupportSessions)
      .leftJoin(user, eq(platformSupportSessions.adminUserId, user.id))
      .where(eq(platformSupportSessions.impersonationSessionId, impersonationSessionId))
      .limit(1);

    if (
      !support ||
      support.support.status !== "active" ||
      support.support.expiresAt <= new Date()
    ) {
      return null;
    }

    return {
      ...this.supportDto(support.support),
      adminName: support.admin?.name ?? null,
      adminEmail: support.admin?.email ?? null,
    };
  }

  async endSupport(impersonationSessionId?: string | null) {
    const current = await this.currentSupport(impersonationSessionId);
    if (!current) throw new BadRequestException("Nenhum Suporte Assistido ativo.");
    const endedAt = new Date();
    await this.db
      .update(platformSupportSessions)
      .set({ status: "ended", endedAt })
      .where(eq(platformSupportSessions.id, current.id));
    return { ...current, status: "ended", endedAt: endedAt.toISOString() };
  }

  private supportDto(row: typeof platformSupportSessions.$inferSelect) {
    return {
      id: row.id,
      adminUserId: row.adminUserId,
      targetUserId: row.targetUserId,
      academyId: row.academyId,
      reason: row.reason,
      status: row.status,
      startedAt: row.startedAt.toISOString(),
      activatedAt: row.activatedAt?.toISOString() ?? null,
      endedAt: row.endedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt.toISOString(),
    };
  }
}
