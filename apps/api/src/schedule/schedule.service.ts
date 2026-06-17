import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateAdHocClassInput,
  CreateRecurringCancellationInput,
  ScheduleOccurrence,
  TodayScheduleResponse,
  WeeklyScheduleResponse,
} from "@tatamiq/contracts";
import {
  attendances,
  classCancellations,
  classGroupSchedules,
  classGroups,
  classGroupTags,
  classSessions,
  type Database,
  studentClassGroups,
} from "@tatamiq/database";
import { and, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { saoPauloDatePart, toSaoPauloScheduledStartAt } from "./schedule-rules";
import {
  type AgendaAdHocRow,
  type AgendaRecurringCancellationRow,
  type AgendaScheduleRow,
  projectWeeklyAgenda,
  toAdHocOccurrence,
  toRecurringOccurrence,
  weeklyAgendaRange,
} from "./weekly-agenda-projection";

@Injectable()
export class ScheduleService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async week(organizationId: string, weekStartInput?: string): Promise<WeeklyScheduleResponse> {
    const range = weeklyAgendaRange(weekStartInput ?? saoPauloDatePart(new Date()));
    const [scheduleRows, adHocRows, recurringCancellations, recurringSessionRows] =
      await Promise.all([
        this.activeScheduleRows(organizationId),
        this.adHocRows(organizationId, range.weekStart, range.weekEndExclusive),
        this.recurringCancellations(organizationId, range.weekStart, range.weekEndExclusive),
        this.recurringSessionRows(organizationId, range.weekStart, range.weekEndExclusive),
      ]);
    const classGroupIds = [
      ...new Set([
        ...scheduleRows.map((row) => row.classGroupId),
        ...adHocRows.map((row) => row.classGroupId),
      ]),
    ];
    const sessionIds = adHocRows
      .filter((row) => row.status === "active" || row.status === "ended")
      .map((row) => row.id);
    const allSessionIds = [...sessionIds, ...recurringSessionRows.map((row) => row.id)];
    const [tagsByClassGroup, studentCountByClassGroup, attendanceCountBySession] =
      await Promise.all([
        this.tagsByClassGroup(classGroupIds),
        this.studentCountByClassGroup(organizationId, classGroupIds),
        this.attendanceCountBySession(allSessionIds),
      ]);

    return projectWeeklyAgenda({
      range,
      scheduleRows,
      adHocRows,
      recurringCancellations,
      recurringSessionRows,
      tagsByClassGroup,
      studentCountByClassGroup,
      attendanceCountBySession,
    });
  }

  async today(organizationId: string): Promise<TodayScheduleResponse> {
    const date = saoPauloDatePart(new Date());
    const week = await this.week(organizationId, date);
    return {
      date,
      occurrences: week.days.find((day) => day.date === date)?.occurrences ?? [],
    };
  }

  async createAdHoc(
    organizationId: string,
    userId: string,
    input: CreateAdHocClassInput,
  ): Promise<ScheduleOccurrence> {
    const classGroup = await this.findActiveClassGroup(organizationId, input.classGroupId);
    const scheduledStartAt = input.scheduledStartAt ? new Date(input.scheduledStartAt) : new Date();
    const id = crypto.randomUUID();
    const now = new Date();

    await this.db.insert(classSessions).values({
      id,
      organizationId,
      classGroupId: classGroup.id,
      kind: "ad_hoc",
      scheduledStartAt,
      actualStartAt: null,
      durationMinutes: input.durationMinutes,
      endedAt: null,
      status: "scheduled",
      cancelledAt: null,
      cancelledByUserId: null,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });

    return this.findAdHocOccurrence(organizationId, id);
  }

  async cancelAdHoc(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<ScheduleOccurrence> {
    await this.findAdHocSession(organizationId, id);
    await this.db
      .update(classSessions)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledByUserId: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(classSessions.id, id), eq(classSessions.organizationId, organizationId)));
    return this.findAdHocOccurrence(organizationId, id);
  }

  async deleteAdHoc(organizationId: string, id: string): Promise<void> {
    await this.findAdHocSession(organizationId, id);
    await this.db
      .delete(classSessions)
      .where(and(eq(classSessions.id, id), eq(classSessions.organizationId, organizationId)));
  }

  async reactivateAdHoc(organizationId: string, id: string): Promise<ScheduleOccurrence> {
    await this.findAdHocSession(organizationId, id);
    await this.db
      .update(classSessions)
      .set({
        status: "scheduled",
        cancelledAt: null,
        cancelledByUserId: null,
        updatedAt: new Date(),
      })
      .where(and(eq(classSessions.id, id), eq(classSessions.organizationId, organizationId)));
    return this.findAdHocOccurrence(organizationId, id);
  }

  async cancelRecurring(
    organizationId: string,
    userId: string,
    input: CreateRecurringCancellationInput,
  ): Promise<ScheduleOccurrence> {
    const schedule = await this.findSchedule(organizationId, input.scheduleId, input.classGroupId);
    const existing = await this.db
      .select()
      .from(classCancellations)
      .where(
        and(
          eq(classCancellations.organizationId, organizationId),
          eq(classCancellations.classGroupScheduleId, input.scheduleId),
          eq(classCancellations.occurrenceDate, input.occurrenceDate),
          isNull(classCancellations.revertedAt),
        ),
      )
      .limit(1);

    const cancellationId = existing[0]?.id ?? crypto.randomUUID();
    if (!existing[0]) {
      await this.db.insert(classCancellations).values({
        id: cancellationId,
        organizationId,
        classGroupId: input.classGroupId,
        classGroupScheduleId: input.scheduleId,
        occurrenceDate: input.occurrenceDate,
        createdByUserId: userId,
        cancelledAt: new Date(),
        revertedAt: null,
        revertedByUserId: null,
      });
    }

    const tagsByClassGroup = await this.tagsByClassGroup([schedule.classGroupId]);
    const studentCountByClassGroup = await this.studentCountByClassGroup(organizationId, [
      schedule.classGroupId,
    ]);
    const [cancellation] = await this.db
      .select()
      .from(classCancellations)
      .where(eq(classCancellations.id, cancellationId))
      .limit(1);
    return toRecurringOccurrence(
      schedule,
      input.occurrenceDate,
      tagsByClassGroup,
      studentCountByClassGroup,
      cancellation,
      null,
    );
  }

  async revertRecurring(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<ScheduleOccurrence> {
    const [cancellation] = await this.db
      .select()
      .from(classCancellations)
      .where(
        and(eq(classCancellations.id, id), eq(classCancellations.organizationId, organizationId)),
      )
      .limit(1);
    if (!cancellation) throw new NotFoundException("Cancelamento não encontrado.");

    await this.db
      .update(classCancellations)
      .set({ revertedAt: new Date(), revertedByUserId: userId })
      .where(eq(classCancellations.id, id));

    const schedule = await this.findSchedule(
      organizationId,
      cancellation.classGroupScheduleId,
      cancellation.classGroupId,
    );
    const tagsByClassGroup = await this.tagsByClassGroup([schedule.classGroupId]);
    const studentCountByClassGroup = await this.studentCountByClassGroup(organizationId, [
      schedule.classGroupId,
    ]);
    return toRecurringOccurrence(
      schedule,
      cancellation.occurrenceDate,
      tagsByClassGroup,
      studentCountByClassGroup,
      undefined,
      null,
    );
  }

  private async activeScheduleRows(organizationId: string): Promise<AgendaScheduleRow[]> {
    return this.db
      .select({
        scheduleId: classGroupSchedules.id,
        weekday: classGroupSchedules.weekday,
        startTime: classGroupSchedules.startTime,
        classGroupId: classGroups.id,
        classGroupName: classGroups.name,
        durationMinutes: classGroups.defaultDurationMinutes,
      })
      .from(classGroupSchedules)
      .innerJoin(classGroups, eq(classGroups.id, classGroupSchedules.classGroupId))
      .where(and(eq(classGroups.organizationId, organizationId), eq(classGroups.status, "active")));
  }

  private async adHocRows(
    organizationId: string,
    fromDate: string,
    toDateExclusive: string,
  ): Promise<AgendaAdHocRow[]> {
    return this.db
      .select({
        id: classSessions.id,
        classGroupId: classGroups.id,
        classGroupName: classGroups.name,
        scheduledStartAt: classSessions.scheduledStartAt,
        durationMinutes: classSessions.durationMinutes,
        status: classSessions.status,
      })
      .from(classSessions)
      .innerJoin(classGroups, eq(classGroups.id, classSessions.classGroupId))
      .where(
        and(
          eq(classSessions.organizationId, organizationId),
          eq(classSessions.kind, "ad_hoc"),
          gte(
            classSessions.scheduledStartAt,
            new Date(toSaoPauloScheduledStartAt(fromDate, "00:00")),
          ),
          lt(
            classSessions.scheduledStartAt,
            new Date(toSaoPauloScheduledStartAt(toDateExclusive, "00:00")),
          ),
        ),
      );
  }

  private async recurringCancellations(
    organizationId: string,
    fromDate: string,
    toDateExclusive: string,
  ): Promise<AgendaRecurringCancellationRow[]> {
    return this.db
      .select()
      .from(classCancellations)
      .where(
        and(
          eq(classCancellations.organizationId, organizationId),
          gte(classCancellations.occurrenceDate, fromDate),
          lt(classCancellations.occurrenceDate, toDateExclusive),
        ),
      );
  }

  private async findActiveClassGroup(organizationId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(classGroups)
      .where(
        and(
          eq(classGroups.id, id),
          eq(classGroups.organizationId, organizationId),
          eq(classGroups.status, "active"),
        ),
      )
      .limit(1);
    if (!row) throw new BadRequestException("Turma ativa não encontrada.");
    return row;
  }

  private async findSchedule(
    organizationId: string,
    scheduleId: string,
    classGroupId: string,
  ): Promise<AgendaScheduleRow> {
    const rows = await this.activeScheduleRows(organizationId);
    const schedule = rows.find(
      (row) => row.scheduleId === scheduleId && row.classGroupId === classGroupId,
    );
    if (!schedule) throw new NotFoundException("Horário recorrente não encontrado.");
    return schedule;
  }

  private async findAdHocSession(organizationId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(classSessions)
      .where(
        and(
          eq(classSessions.id, id),
          eq(classSessions.organizationId, organizationId),
          eq(classSessions.kind, "ad_hoc"),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Aula avulsa não encontrada.");
    return row;
  }

  private async findAdHocOccurrence(
    organizationId: string,
    id: string,
  ): Promise<ScheduleOccurrence> {
    const session = await this.findAdHocSession(organizationId, id);
    const [classGroup] = await this.db
      .select()
      .from(classGroups)
      .where(eq(classGroups.id, session.classGroupId))
      .limit(1);
    if (!classGroup) throw new NotFoundException("Turma não encontrada.");
    const tagsByClassGroup = await this.tagsByClassGroup([classGroup.id]);
    const studentCountByClassGroup = await this.studentCountByClassGroup(organizationId, [
      classGroup.id,
    ]);
    return toAdHocOccurrence(
      {
        id: session.id,
        classGroupId: classGroup.id,
        classGroupName: classGroup.name,
        scheduledStartAt: session.scheduledStartAt,
        durationMinutes: session.durationMinutes,
        status: session.status,
      },
      tagsByClassGroup,
      studentCountByClassGroup,
      null,
    );
  }

  private async recurringSessionRows(
    organizationId: string,
    fromDate: string,
    toDateExclusive: string,
  ) {
    return this.db
      .select({
        id: classSessions.id,
        classGroupId: classSessions.classGroupId,
        scheduledStartAt: classSessions.scheduledStartAt,
        status: classSessions.status,
      })
      .from(classSessions)
      .where(
        and(
          eq(classSessions.organizationId, organizationId),
          eq(classSessions.kind, "recurring"),
          gte(
            classSessions.scheduledStartAt,
            new Date(toSaoPauloScheduledStartAt(fromDate, "00:00")),
          ),
          lt(
            classSessions.scheduledStartAt,
            new Date(toSaoPauloScheduledStartAt(toDateExclusive, "00:00")),
          ),
        ),
      );
  }

  private async attendanceCountBySession(sessionIds: string[]): Promise<Map<string, number>> {
    if (sessionIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        classSessionId: attendances.classSessionId,
      })
      .from(attendances)
      .where(
        and(inArray(attendances.classSessionId, sessionIds), isNull(attendances.invalidatedAt)),
      );
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.classSessionId, (map.get(row.classSessionId) ?? 0) + 1);
    }
    return map;
  }

  private async tagsByClassGroup(classGroupIds: string[]): Promise<Map<string, string[]>> {
    if (classGroupIds.length === 0) return new Map();
    const tags = await this.db
      .select({ classGroupId: classGroupTags.classGroupId, label: classGroupTags.label })
      .from(classGroupTags)
      .where(inArray(classGroupTags.classGroupId, classGroupIds));

    const map = new Map<string, string[]>();
    for (const tag of tags)
      map.set(tag.classGroupId, [...(map.get(tag.classGroupId) ?? []), tag.label]);
    return map;
  }

  private async studentCountByClassGroup(
    organizationId: string,
    classGroupIds: string[],
  ): Promise<Map<string, number>> {
    if (classGroupIds.length === 0) return new Map();
    const links = await this.db
      .select({ classGroupId: studentClassGroups.classGroupId })
      .from(studentClassGroups)
      .where(
        and(
          eq(studentClassGroups.organizationId, organizationId),
          inArray(studentClassGroups.classGroupId, classGroupIds),
          isNull(studentClassGroups.activeUntil),
        ),
      );

    const map = new Map<string, number>();
    for (const link of links) map.set(link.classGroupId, (map.get(link.classGroupId) ?? 0) + 1);
    return map;
  }
}
