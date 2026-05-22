import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ClassSession, QrTokenResponse, StartRecurringClassInput } from "@tatamiq/contracts";
import { classGroupSchedules, classGroups, classSessions, type Database } from "@tatamiq/database";
import { and, eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { canTransition } from "./class-rules";
import { generateQrToken, QR_WINDOW_SECONDS } from "./qr-token";

@Injectable()
export class ClassesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async startRecurring(
    organizationId: string,
    userId: string,
    input: StartRecurringClassInput,
  ): Promise<ClassSession> {
    const [schedule] = await this.db
      .select({
        id: classGroupSchedules.id,
        classGroupId: classGroupSchedules.classGroupId,
        weekday: classGroupSchedules.weekday,
        startTime: classGroupSchedules.startTime,
      })
      .from(classGroupSchedules)
      .innerJoin(classGroups, eq(classGroups.id, classGroupSchedules.classGroupId))
      .where(
        and(
          eq(classGroupSchedules.id, input.scheduleId),
          eq(classGroupSchedules.classGroupId, input.classGroupId),
          eq(classGroups.organizationId, organizationId),
          eq(classGroups.status, "active"),
        ),
      )
      .limit(1);

    if (!schedule) throw new NotFoundException("Horário recorrente não encontrado.");

    const [classGroup] = await this.db
      .select()
      .from(classGroups)
      .where(eq(classGroups.id, input.classGroupId))
      .limit(1);

    if (!classGroup) throw new NotFoundException("Turma não encontrada.");

    const now = new Date();
    const id = crypto.randomUUID();
    const scheduledStartAt = new Date(`${input.scheduledDate}T${schedule.startTime}:00.000Z`);

    await this.db.insert(classSessions).values({
      id,
      organizationId,
      classGroupId: input.classGroupId,
      kind: "recurring",
      scheduledStartAt,
      actualStartAt: now,
      durationMinutes: classGroup.defaultDurationMinutes,
      endedAt: null,
      status: "active",
      cancelledAt: null,
      cancelledByUserId: null,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });

    return this.toClassSession(id, organizationId);
  }

  async startAdHoc(organizationId: string, id: string): Promise<ClassSession> {
    const session = await this.findSession(organizationId, id);

    if (!canTransition(session.status, "active")) {
      throw new BadRequestException(
        `Não é possível iniciar uma aula com status "${session.status}".`,
      );
    }

    const now = new Date();
    await this.db
      .update(classSessions)
      .set({ status: "active", actualStartAt: now, updatedAt: now })
      .where(and(eq(classSessions.id, id), eq(classSessions.organizationId, organizationId)));

    return this.toClassSession(id, organizationId);
  }

  async getActive(organizationId: string): Promise<ClassSession | null> {
    const [row] = await this.db
      .select({
        id: classSessions.id,
        classGroupId: classSessions.classGroupId,
        classGroupName: classGroups.name,
        kind: classSessions.kind,
        status: classSessions.status,
        scheduledStartAt: classSessions.scheduledStartAt,
        actualStartAt: classSessions.actualStartAt,
        durationMinutes: classSessions.durationMinutes,
        endedAt: classSessions.endedAt,
      })
      .from(classSessions)
      .innerJoin(classGroups, eq(classGroups.id, classSessions.classGroupId))
      .where(
        and(eq(classSessions.organizationId, organizationId), eq(classSessions.status, "active")),
      )
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      classGroupId: row.classGroupId,
      classGroupName: row.classGroupName,
      kind: row.kind as "recurring" | "ad_hoc",
      status: "active",
      scheduledStartAt: row.scheduledStartAt.toISOString(),
      actualStartAt: row.actualStartAt?.toISOString() ?? null,
      durationMinutes: row.durationMinutes,
      endedAt: null,
    };
  }

  async getById(organizationId: string, id: string): Promise<ClassSession> {
    return this.toClassSession(id, organizationId);
  }

  async getQrToken(organizationId: string, id: string): Promise<QrTokenResponse> {
    const session = await this.findSession(organizationId, id);

    if (session.status !== "active") {
      throw new BadRequestException("QR token disponível apenas para aula ativa.");
    }

    const secret =
      process.env.BETTER_AUTH_SECRET ??
      "dev-only-tatamiq-better-auth-secret-change-me-minimum-32-chars";

    const result = generateQrToken(id, organizationId, secret);

    return {
      ...result,
      windowSeconds: QR_WINDOW_SECONDS,
    };
  }

  async end(organizationId: string, id: string): Promise<ClassSession> {
    const session = await this.findSession(organizationId, id);

    if (!canTransition(session.status, "ended")) {
      throw new BadRequestException(
        `Não é possível encerrar uma aula com status "${session.status}".`,
      );
    }

    const now = new Date();
    await this.db
      .update(classSessions)
      .set({ status: "ended", endedAt: now, updatedAt: now })
      .where(and(eq(classSessions.id, id), eq(classSessions.organizationId, organizationId)));

    return this.toClassSession(id, organizationId);
  }

  private async findSession(organizationId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(classSessions)
      .where(and(eq(classSessions.id, id), eq(classSessions.organizationId, organizationId)))
      .limit(1);

    if (!row) throw new NotFoundException("Aula não encontrada.");
    return row;
  }

  private async toClassSession(id: string, organizationId: string): Promise<ClassSession> {
    const [row] = await this.db
      .select({
        id: classSessions.id,
        classGroupId: classSessions.classGroupId,
        classGroupName: classGroups.name,
        kind: classSessions.kind,
        status: classSessions.status,
        scheduledStartAt: classSessions.scheduledStartAt,
        actualStartAt: classSessions.actualStartAt,
        durationMinutes: classSessions.durationMinutes,
        endedAt: classSessions.endedAt,
      })
      .from(classSessions)
      .innerJoin(classGroups, eq(classGroups.id, classSessions.classGroupId))
      .where(and(eq(classSessions.id, id), eq(classSessions.organizationId, organizationId)))
      .limit(1);

    if (!row) throw new NotFoundException("Aula não encontrada.");

    return {
      id: row.id,
      classGroupId: row.classGroupId,
      classGroupName: row.classGroupName,
      kind: row.kind as "recurring" | "ad_hoc",
      status: row.status as "scheduled" | "active" | "ended" | "cancelled",
      scheduledStartAt: row.scheduledStartAt.toISOString(),
      actualStartAt: row.actualStartAt?.toISOString() ?? null,
      durationMinutes: row.durationMinutes,
      endedAt: row.endedAt?.toISOString() ?? null,
    };
  }
}
