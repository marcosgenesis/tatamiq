import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  MarkSeenInput,
  StudentAttendancesResponse,
  StudentIndicatorsResponse,
  StudentScheduleResponse,
  UpdateStudentProfileInput,
} from "@tatamiq/contracts";
import {
  attendances,
  classCancellations,
  classGroupSchedules,
  classGroups,
  classSessions,
  type Database,
  monthlyFees,
  promotions,
  studentAccess,
  studentClassGroups,
  studentContactChanges,
  studentNotes,
  students,
} from "@tatamiq/database";
import { and, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import {
  type AgendaAdHocRow,
  type AgendaRecurringCancellationRow,
  type AgendaRecurringSessionRow,
  type AgendaScheduleRow,
  projectAgendaDays,
} from "../schedule/weekly-agenda-projection";

@Injectable()
export class StudentPortalService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async schedule(studentId: string): Promise<StudentScheduleResponse> {
    const groupLinks = await this.db
      .select({ classGroupId: studentClassGroups.classGroupId })
      .from(studentClassGroups)
      .where(
        and(eq(studentClassGroups.studentId, studentId), isNull(studentClassGroups.activeUntil)),
      );

    const groupIds = groupLinks.map((l) => l.classGroupId);
    if (groupIds.length === 0) return { days: [] };

    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    const todayDate = today.toISOString().slice(0, 10);
    const endDate = new Date(today);
    endDate.setUTCDate(endDate.getUTCDate() + 7);
    const endDateExclusive = endDate.toISOString().slice(0, 10);
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() + index);
      return date.toISOString().slice(0, 10);
    });

    const [scheduleRows, adHocRows, recurringCancellations, recurringSessionRows] =
      await Promise.all([
        this.studentAgendaScheduleRows(groupIds),
        this.studentAgendaAdHocRows(groupIds, todayDate, endDateExclusive),
        this.studentAgendaRecurringCancellations(groupIds, todayDate, endDateExclusive),
        this.studentAgendaRecurringSessionRows(groupIds, todayDate, endDateExclusive),
      ]);

    const days = projectAgendaDays(
      {
        range: { weekStart: todayDate, weekEndExclusive: endDateExclusive },
        scheduleRows,
        adHocRows,
        recurringCancellations,
        recurringSessionRows,
        tagsByClassGroup: new Map(),
        studentCountByClassGroup: new Map(),
        attendanceCountBySession: new Map(),
      },
      dates,
    );

    return {
      days: days.map((day) => ({
        date: day.date,
        weekday: day.weekday,
        classes: day.occurrences.map((occurrence) => ({
          id: occurrence.id,
          classGroupId: occurrence.classGroupId,
          classGroupName: occurrence.classGroupName,
          scheduledStartAt: occurrence.scheduledStartAt,
          durationMinutes: occurrence.durationMinutes,
          status: occurrence.status === "cancelled" ? "cancelled" : "scheduled",
          source: occurrence.source,
        })),
      })),
    };
  }

  private async studentAgendaScheduleRows(groupIds: string[]): Promise<AgendaScheduleRow[]> {
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
      .innerJoin(classGroups, eq(classGroupSchedules.classGroupId, classGroups.id))
      .where(
        and(inArray(classGroupSchedules.classGroupId, groupIds), eq(classGroups.status, "active")),
      );
  }

  private async studentAgendaAdHocRows(
    groupIds: string[],
    fromDate: string,
    toDateExclusive: string,
  ): Promise<AgendaAdHocRow[]> {
    return this.db
      .select({
        id: classSessions.id,
        classGroupId: classSessions.classGroupId,
        classGroupName: classGroups.name,
        scheduledStartAt: classSessions.scheduledStartAt,
        durationMinutes: classSessions.durationMinutes,
        status: classSessions.status,
      })
      .from(classSessions)
      .innerJoin(classGroups, eq(classSessions.classGroupId, classGroups.id))
      .where(
        and(
          inArray(classSessions.classGroupId, groupIds),
          eq(classSessions.kind, "ad_hoc"),
          gte(classSessions.scheduledStartAt, new Date(`${fromDate}T00:00:00.000Z`)),
          lt(classSessions.scheduledStartAt, new Date(`${toDateExclusive}T00:00:00.000Z`)),
        ),
      );
  }

  private async studentAgendaRecurringCancellations(
    groupIds: string[],
    fromDate: string,
    toDateExclusive: string,
  ): Promise<AgendaRecurringCancellationRow[]> {
    return this.db
      .select()
      .from(classCancellations)
      .where(
        and(
          inArray(classCancellations.classGroupId, groupIds),
          gte(classCancellations.occurrenceDate, fromDate),
          lt(classCancellations.occurrenceDate, toDateExclusive),
        ),
      );
  }

  private async studentAgendaRecurringSessionRows(
    groupIds: string[],
    fromDate: string,
    toDateExclusive: string,
  ): Promise<AgendaRecurringSessionRow[]> {
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
          inArray(classSessions.classGroupId, groupIds),
          eq(classSessions.kind, "recurring"),
          gte(classSessions.scheduledStartAt, new Date(`${fromDate}T00:00:00.000Z`)),
          lt(classSessions.scheduledStartAt, new Date(`${toDateExclusive}T00:00:00.000Z`)),
        ),
      );
  }

  async attendanceHistory(studentId: string): Promise<StudentAttendancesResponse> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const rows = await this.db
      .select({
        attendance: attendances,
        classGroupName: classGroups.name,
      })
      .from(attendances)
      .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
      .innerJoin(classGroups, eq(classSessions.classGroupId, classGroups.id))
      .where(and(eq(attendances.studentId, studentId), gte(attendances.createdAt, twelveMonthsAgo)))
      .orderBy(desc(attendances.createdAt));

    return {
      attendances: rows.map((r) => ({
        id: r.attendance.id,
        classGroupName: r.classGroupName,
        source: r.attendance.source as "qr" | "manual",
        isOutOfGroup: false,
        invalidatedAt: r.attendance.invalidatedAt?.toISOString() ?? null,
        createdAt: r.attendance.createdAt.toISOString(),
      })),
    };
  }

  async updateProfile(
    studentId: string,
    userId: string,
    input: UpdateStudentProfileInput,
  ): Promise<void> {
    const [student] = await this.db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student) throw new NotFoundException("Aluno não encontrado.");

    const changes: { field: string; previousValue: string | null; newValue: string | null }[] = [];

    if (input.phone !== undefined && input.phone !== student.phone) {
      changes.push({ field: "phone", previousValue: student.phone, newValue: input.phone || null });
    }
    if (input.email !== undefined && input.email !== student.email) {
      changes.push({ field: "email", previousValue: student.email, newValue: input.email || null });
    }

    if (changes.length === 0) return;

    await this.db.transaction(async (tx) => {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      for (const change of changes) {
        updates[change.field] = change.newValue;
      }
      await tx.update(students).set(updates).where(eq(students.id, studentId));

      for (const change of changes) {
        await tx.insert(studentContactChanges).values({
          id: crypto.randomUUID(),
          studentId,
          field: change.field,
          previousValue: change.previousValue,
          newValue: change.newValue,
          changedByUserId: userId,
        });
      }
    });
  }

  async indicators(studentId: string, _userId: string): Promise<StudentIndicatorsResponse> {
    const [access] = await this.db
      .select()
      .from(studentAccess)
      .where(and(eq(studentAccess.studentId, studentId), eq(studentAccess.status, "active")))
      .limit(1);

    if (!access) {
      return {
        hasNewFees: false,
        hasNewNotes: false,
        hasNewPromotion: false,
        hasCancelledClass: false,
      };
    }

    const lastSeenFees = access.lastSeenFeesAt ?? access.createdAt;
    const lastSeenNotes = access.lastSeenNotesAt ?? access.createdAt;
    const lastSeenGraduation = access.lastSeenGraduationAt ?? access.createdAt;
    const lastSeenSchedule = access.lastSeenScheduleAt ?? access.createdAt;

    const [feesResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(monthlyFees)
      .where(and(eq(monthlyFees.studentId, studentId), gte(monthlyFees.updatedAt, lastSeenFees)));

    const [notesResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(studentNotes)
      .where(
        and(
          eq(studentNotes.studentId, studentId),
          eq(studentNotes.isVisible, true),
          isNull(studentNotes.archivedAt),
          gte(studentNotes.createdAt, lastSeenNotes),
        ),
      );

    const [promoResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(promotions)
      .where(
        and(eq(promotions.studentId, studentId), gte(promotions.createdAt, lastSeenGraduation)),
      );

    const [student] = await this.db
      .select({ organizationId: students.organizationId })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    let hasCancelledClass = false;
    if (student) {
      const groupLinks = await this.db
        .select({ classGroupId: studentClassGroups.classGroupId })
        .from(studentClassGroups)
        .where(eq(studentClassGroups.studentId, studentId));

      if (groupLinks.length > 0) {
        const groupIds = groupLinks.map((l) => l.classGroupId);
        const [cancelResult] = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(classCancellations)
          .where(
            and(
              sql`${classCancellations.classGroupId} IN (${sql.join(
                groupIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
              gte(classCancellations.cancelledAt, lastSeenSchedule),
            ),
          );
        hasCancelledClass = (cancelResult?.count ?? 0) > 0;
      }
    }

    return {
      hasNewFees: (feesResult?.count ?? 0) > 0,
      hasNewNotes: (notesResult?.count ?? 0) > 0,
      hasNewPromotion: (promoResult?.count ?? 0) > 0,
      hasCancelledClass,
    };
  }

  async markSeen(studentId: string, input: MarkSeenInput): Promise<void> {
    const columnMap: Record<string, string> = {
      fees: "lastSeenFeesAt",
      notes: "lastSeenNotesAt",
      graduation: "lastSeenGraduationAt",
      schedule: "lastSeenScheduleAt",
    };

    const column = columnMap[input.type];
    if (!column) return;

    await this.db
      .update(studentAccess)
      .set({ [column]: new Date(), updatedAt: new Date() })
      .where(and(eq(studentAccess.studentId, studentId), eq(studentAccess.status, "active")));
  }
}
