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
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { DATABASE } from "../database/database.module";

@Injectable()
export class StudentPortalService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async schedule(studentId: string): Promise<StudentScheduleResponse> {
    const groupLinks = await this.db
      .select({ classGroupId: studentClassGroups.classGroupId })
      .from(studentClassGroups)
      .where(eq(studentClassGroups.studentId, studentId));

    const groupIds = groupLinks.map((l) => l.classGroupId);
    if (groupIds.length === 0) return { days: [] };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);

    const schedules = await this.db
      .select({
        schedule: classGroupSchedules,
        groupName: classGroups.name,
        groupId: classGroups.id,
        duration: classGroups.defaultDurationMinutes,
      })
      .from(classGroupSchedules)
      .innerJoin(classGroups, eq(classGroupSchedules.classGroupId, classGroups.id))
      .where(
        sql`${classGroupSchedules.classGroupId} IN (${sql.join(
          groupIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );

    const cancellations = await this.db
      .select()
      .from(classCancellations)
      .where(
        and(
          sql`${classCancellations.classGroupId} IN (${sql.join(
            groupIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
          gte(classCancellations.occurrenceDate, today.toISOString().split("T")[0]),
          lt(classCancellations.occurrenceDate, endDate.toISOString().split("T")[0]),
        ),
      );

    const cancelledSet = new Set(
      cancellations.map((c) => `${c.classGroupId}:${c.classGroupScheduleId}:${c.occurrenceDate}`),
    );

    const adHocClasses = await this.db
      .select({
        session: classSessions,
        groupName: classGroups.name,
      })
      .from(classSessions)
      .innerJoin(classGroups, eq(classSessions.classGroupId, classGroups.id))
      .where(
        and(
          sql`${classSessions.classGroupId} IN (${sql.join(
            groupIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
          eq(classSessions.kind, "ad_hoc"),
          gte(classSessions.scheduledStartAt, today),
          lt(classSessions.scheduledStartAt, endDate),
        ),
      );

    const daysMap = new Map<
      string,
      { date: string; weekday: number; classes: StudentScheduleResponse["days"][0]["classes"] }
    >();

    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split("T")[0];
      daysMap.set(dateStr, {
        date: dateStr,
        weekday: date.getDay(),
        classes: [],
      });
    }

    for (const { schedule, groupName, groupId, duration } of schedules) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() + d);
        if (date.getDay() !== schedule.weekday) continue;

        const dateStr = date.toISOString().split("T")[0];
        const cancelKey = `${groupId}:${schedule.id}:${dateStr}`;
        const isCancelled = cancelledSet.has(cancelKey);

        const [hours, minutes] = schedule.startTime.split(":").map(Number);
        const startAt = new Date(date);
        startAt.setHours(hours, minutes, 0, 0);

        daysMap.get(dateStr)?.classes.push({
          id: `${schedule.id}-${dateStr}`,
          classGroupId: groupId,
          classGroupName: groupName,
          scheduledStartAt: startAt.toISOString(),
          durationMinutes: duration,
          status: isCancelled ? "cancelled" : "scheduled",
          source: "recurring",
        });
      }
    }

    for (const { session, groupName } of adHocClasses) {
      const dateStr = session.scheduledStartAt.toISOString().split("T")[0];
      daysMap.get(dateStr)?.classes.push({
        id: session.id,
        classGroupId: session.classGroupId,
        classGroupName: groupName,
        scheduledStartAt: session.scheduledStartAt.toISOString(),
        durationMinutes: session.durationMinutes,
        status: session.status === "cancelled" ? "cancelled" : "scheduled",
        source: "ad_hoc",
      });
    }

    return {
      days: Array.from(daysMap.values()).filter((d) => d.classes.length > 0 || true),
    };
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

  async indicators(studentId: string, userId: string): Promise<StudentIndicatorsResponse> {
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
