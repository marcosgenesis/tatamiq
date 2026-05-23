import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AddManualAttendanceInput,
  Attendance,
  AttendanceRosterResponse,
  InvalidateAttendanceInput,
} from "@tatamiq/contracts";
import {
  attendances,
  classSessions,
  type Database,
  studentClassGroups,
  students,
} from "@tatamiq/database";
import { and, eq, isNull } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { canAddAttendance, canInvalidateAttendance } from "./attendance-rules";

@Injectable()
export class AttendancesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async roster(organizationId: string, classSessionId: string): Promise<AttendanceRosterResponse> {
    const session = await this.findSession(organizationId, classSessionId);

    const rosterStudents = await this.db
      .select({
        studentId: students.id,
        studentName: students.name,
      })
      .from(studentClassGroups)
      .innerJoin(students, eq(students.id, studentClassGroups.studentId))
      .where(
        and(
          eq(studentClassGroups.organizationId, organizationId),
          eq(studentClassGroups.classGroupId, session.classGroupId),
          isNull(studentClassGroups.activeUntil),
        ),
      );

    const attendanceRows = await this.db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.organizationId, organizationId),
          eq(attendances.classSessionId, classSessionId),
        ),
      );

    const rosterStudentIds = new Set(rosterStudents.map((s) => s.studentId));

    const outOfGroupAttendances = attendanceRows.filter(
      (a) => !rosterStudentIds.has(a.studentId) && !a.invalidatedAt,
    );

    const outOfGroupStudentIds = [...new Set(outOfGroupAttendances.map((a) => a.studentId))];
    let outOfGroupStudents: { studentId: string; studentName: string }[] = [];
    if (outOfGroupStudentIds.length > 0) {
      const rows = await Promise.all(
        outOfGroupStudentIds.map(async (id) => {
          const [row] = await this.db
            .select({ id: students.id, name: students.name })
            .from(students)
            .where(eq(students.id, id))
            .limit(1);
          return row ? { studentId: row.id, studentName: row.name } : null;
        }),
      );
      outOfGroupStudents = rows.filter((r): r is NonNullable<typeof r> => r !== null);
    }

    const latestAttendanceByStudent = new Map<string, (typeof attendanceRows)[0]>();
    for (const row of attendanceRows) {
      const existing = latestAttendanceByStudent.get(row.studentId);
      if (!existing || new Date(row.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        latestAttendanceByStudent.set(row.studentId, row);
      }
    }

    const outOfGroupStudentNameById = new Map(
      outOfGroupStudents.map((student) => [student.studentId, student.studentName]),
    );

    const roster = [
      ...rosterStudents.map((s) => {
        const att = latestAttendanceByStudent.get(s.studentId) ?? null;
        return {
          studentId: s.studentId,
          studentName: s.studentName,
          isOutOfGroup: false,
          attendance: att ? toAttendanceDto(att, s.studentName, false) : null,
        };
      }),
      ...outOfGroupAttendances.map((att) => {
        const studentName = outOfGroupStudentNameById.get(att.studentId);
        if (!studentName) throw new NotFoundException("Aluno da presença não encontrado.");
        return {
          studentId: att.studentId,
          studentName,
          isOutOfGroup: true,
          attendance: toAttendanceDto(att, studentName, true),
        };
      }),
    ];

    const presentCount = roster.filter((r) => r.attendance && !r.attendance.invalidatedAt).length;

    return {
      classSessionId,
      roster,
      summary: {
        present: presentCount,
        total: rosterStudents.length,
      },
    };
  }

  async addManual(
    organizationId: string,
    userId: string,
    classSessionId: string,
    input: AddManualAttendanceInput,
  ): Promise<Attendance> {
    const session = await this.findSession(organizationId, classSessionId);

    const check = canAddAttendance(session.status);
    if (!check.allowed) throw new BadRequestException(check.reason);

    const [student] = await this.db
      .select({ id: students.id, name: students.name })
      .from(students)
      .where(and(eq(students.id, input.studentId), eq(students.organizationId, organizationId)))
      .limit(1);

    if (!student) throw new NotFoundException("Aluno não encontrado.");

    const [existing] = await this.db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.classSessionId, classSessionId),
          eq(attendances.studentId, input.studentId),
          isNull(attendances.invalidatedAt),
        ),
      )
      .limit(1);

    if (existing) throw new BadRequestException("Aluno já possui presença válida nesta aula.");

    const isOutOfGroup = await this.checkOutOfGroup(
      organizationId,
      session.classGroupId,
      input.studentId,
    );

    const id = crypto.randomUUID();
    const now = new Date();

    await this.db.insert(attendances).values({
      id,
      organizationId,
      classSessionId,
      studentId: input.studentId,
      source: "manual",
      invalidatedAt: null,
      invalidatedByUserId: null,
      invalidationReason: null,
      createdByUserId: userId,
      createdAt: now,
    });

    return {
      id,
      studentId: input.studentId,
      studentName: student.name,
      source: "manual",
      isOutOfGroup,
      invalidatedAt: null,
      invalidationReason: null,
      createdAt: now.toISOString(),
    };
  }

  async invalidate(
    organizationId: string,
    userId: string,
    classSessionId: string,
    attendanceId: string,
    input: InvalidateAttendanceInput,
  ): Promise<Attendance> {
    await this.findSession(organizationId, classSessionId);

    const [row] = await this.db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.id, attendanceId),
          eq(attendances.classSessionId, classSessionId),
          eq(attendances.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException("Presença não encontrada.");

    const check = canInvalidateAttendance(row.invalidatedAt?.toISOString() ?? null);
    if (!check.allowed) throw new BadRequestException(check.reason);

    const now = new Date();
    await this.db
      .update(attendances)
      .set({
        invalidatedAt: now,
        invalidatedByUserId: userId,
        invalidationReason: input.reason,
      })
      .where(eq(attendances.id, attendanceId));

    const [student] = await this.db
      .select({ name: students.name })
      .from(students)
      .where(eq(students.id, row.studentId))
      .limit(1);

    const isOutOfGroup = await this.checkOutOfGroup(
      organizationId,
      (await this.findSession(organizationId, classSessionId)).classGroupId,
      row.studentId,
    );

    return {
      id: row.id,
      studentId: row.studentId,
      studentName: student?.name ?? "",
      source: row.source as "qr" | "manual",
      isOutOfGroup,
      invalidatedAt: now.toISOString(),
      invalidationReason: input.reason,
      createdAt: row.createdAt.toISOString(),
    };
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

  private async checkOutOfGroup(
    organizationId: string,
    classGroupId: string,
    studentId: string,
  ): Promise<boolean> {
    const [link] = await this.db
      .select({ id: studentClassGroups.id })
      .from(studentClassGroups)
      .where(
        and(
          eq(studentClassGroups.organizationId, organizationId),
          eq(studentClassGroups.classGroupId, classGroupId),
          eq(studentClassGroups.studentId, studentId),
          isNull(studentClassGroups.activeUntil),
        ),
      )
      .limit(1);
    return !link;
  }
}

function toAttendanceDto(
  row: {
    id: string;
    studentId: string;
    source: string;
    invalidatedAt: Date | null;
    invalidationReason: string | null;
    createdAt: Date;
  },
  studentName: string,
  isOutOfGroup: boolean,
): Attendance {
  return {
    id: row.id,
    studentId: row.studentId,
    studentName,
    source: row.source as "qr" | "manual",
    isOutOfGroup,
    invalidatedAt: row.invalidatedAt?.toISOString() ?? null,
    invalidationReason: row.invalidationReason,
    createdAt: row.createdAt.toISOString(),
  };
}
