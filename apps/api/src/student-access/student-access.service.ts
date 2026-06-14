import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AcceptStudentInviteInput,
  AcceptStudentInviteResponse,
  CreateStudentInviteResponse,
  InviteSummaryResponse,
  StudentAccessState,
  StudentInvitePreview,
  StudentMeResponse,
} from "@tatamiq/contracts";
import {
  classCancellations,
  classGroupSchedules,
  classGroups,
  classSessions,
  type Database,
  organization,
  studentAccess,
  studentAccessInvites,
  studentClassGroups,
  students,
} from "@tatamiq/database";
import { and, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { parseClassStatus } from "../class-status";
import { DATABASE } from "../database/database.module";
import { StudentAccessActivationService } from "./student-access-activation.service";
import {
  hashToken,
  invitePreviewStatus,
  STUDENT_ACCESS_TERMS_VERSION,
  studentReadState,
} from "./student-access-rules";

const INVITE_DAYS = 7;

type StudentRow = typeof students.$inferSelect;
type InviteRow = typeof studentAccessInvites.$inferSelect;
type AccessRow = typeof studentAccess.$inferSelect;

@Injectable()
export class StudentAccessService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(StudentAccessActivationService)
    private readonly activationService: StudentAccessActivationService,
  ) {}

  async accessStatesForStudents(studentIds: string[]): Promise<Map<string, StudentAccessState>> {
    const result = new Map<string, StudentAccessState>();
    for (const id of studentIds) result.set(id, emptyAccessState());
    if (studentIds.length === 0) return result;

    const accessRows = await this.db
      .select()
      .from(studentAccess)
      .where(and(inArray(studentAccess.studentId, studentIds), eq(studentAccess.status, "active")));
    for (const row of accessRows) {
      result.set(row.studentId, {
        status: "active",
        inviteId: null,
        expiresAt: null,
        accessId: row.id,
      });
    }

    const inviteRows = await this.db
      .select()
      .from(studentAccessInvites)
      .where(
        and(
          inArray(studentAccessInvites.studentId, studentIds),
          eq(studentAccessInvites.status, "pending"),
        ),
      );
    const now = new Date();
    for (const row of inviteRows) {
      if (result.get(row.studentId)?.status === "active") continue;
      result.set(row.studentId, {
        status: row.expiresAt.getTime() <= now.getTime() ? "expired" : "pending",
        inviteId: row.id,
        expiresAt: row.expiresAt.toISOString(),
        accessId: null,
      });
    }

    return result;
  }

  async inviteSummary(organizationId: string): Promise<InviteSummaryResponse> {
    const rows = await this.db
      .select({ expiresAt: studentAccessInvites.expiresAt })
      .from(studentAccessInvites)
      .where(
        and(
          eq(studentAccessInvites.organizationId, organizationId),
          eq(studentAccessInvites.status, "pending"),
        ),
      );

    const now = new Date();
    let pending = 0;
    let expired = 0;
    for (const row of rows) {
      if (row.expiresAt.getTime() < now.getTime()) {
        expired++;
      } else {
        pending++;
      }
    }

    return { pending, expired };
  }

  async createInvite(
    organizationId: string,
    userId: string,
    studentId: string,
  ): Promise<CreateStudentInviteResponse> {
    const student = await this.findStudent(organizationId, studentId);
    if (student.status !== "active") {
      throw new BadRequestException("Convite disponível apenas para aluno ativo.");
    }
    const existingAccess = await this.findActiveAccessForStudent(studentId);
    if (existingAccess) {
      throw new BadRequestException("Este aluno já possui acesso ativo.");
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + INVITE_DAYS);
    const inviteId = crypto.randomUUID();

    await this.db.transaction(async (tx) => {
      await tx
        .update(studentAccessInvites)
        .set({ status: "revoked", revokedAt: now, updatedAt: now })
        .where(
          and(
            eq(studentAccessInvites.organizationId, organizationId),
            eq(studentAccessInvites.studentId, studentId),
            eq(studentAccessInvites.status, "pending"),
          ),
        );

      await tx.insert(studentAccessInvites).values({
        id: inviteId,
        organizationId,
        studentId,
        tokenHash,
        status: "pending",
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
        createdByUserId: userId,
        acceptedByUserId: null,
        createdAt: now,
        updatedAt: now,
      });
    });

    return {
      invite: {
        status: "pending",
        inviteId,
        expiresAt: expiresAt.toISOString(),
        accessId: null,
      },
      inviteLink: `${webAppUrl()}/accept-student-invite/${rawToken}`,
    };
  }

  async revokeInvite(
    organizationId: string,
    studentId: string,
    inviteId: string,
  ): Promise<StudentAccessState> {
    await this.findStudent(organizationId, studentId);
    const now = new Date();
    await this.db
      .update(studentAccessInvites)
      .set({ status: "revoked", revokedAt: now, updatedAt: now })
      .where(
        and(
          eq(studentAccessInvites.id, inviteId),
          eq(studentAccessInvites.studentId, studentId),
          eq(studentAccessInvites.organizationId, organizationId),
          eq(studentAccessInvites.status, "pending"),
        ),
      );
    return { status: "revoked", inviteId, expiresAt: null, accessId: null };
  }

  async revokeAccess(
    organizationId: string,
    userId: string,
    studentId: string,
  ): Promise<StudentAccessState> {
    await this.findStudent(organizationId, studentId);
    const access = await this.findActiveAccessForStudent(studentId);
    if (!access || access.organizationId !== organizationId) {
      throw new NotFoundException("Acesso do aluno não encontrado.");
    }
    const now = new Date();
    await this.db
      .update(studentAccess)
      .set({ status: "revoked", revokedAt: now, revokedByUserId: userId, updatedAt: now })
      .where(eq(studentAccess.id, access.id));
    return { status: "revoked", inviteId: null, expiresAt: null, accessId: access.id };
  }

  async previewInvite(token: string): Promise<StudentInvitePreview> {
    const found = await this.findInviteByToken(token);
    if (!found) {
      return { status: "unavailable", academyName: null, studentName: null, expiresAt: null };
    }
    const status = invitePreviewStatus({
      inviteStatus: found.invite.status,
      studentStatus: found.student.status,
      expiresAt: found.invite.expiresAt,
      now: new Date(),
    });
    return {
      status,
      academyName: found.academy.name,
      studentName: found.student.name,
      expiresAt: found.invite.expiresAt.toISOString(),
    };
  }

  async acceptInvite(
    token: string,
    userId: string,
    input: AcceptStudentInviteInput,
  ): Promise<AcceptStudentInviteResponse> {
    if (input.termsVersion !== STUDENT_ACCESS_TERMS_VERSION) {
      throw new BadRequestException("Versão do aceite inválida.");
    }
    const found = await this.findInviteByToken(token);
    if (!found) throw new NotFoundException("Convite não encontrado.");

    const status = invitePreviewStatus({
      inviteStatus: found.invite.status,
      studentStatus: found.student.status,
      expiresAt: found.invite.expiresAt,
      now: new Date(),
    });
    if (status !== "valid") throw new BadRequestException("Convite indisponível.");

    const studentId = found.student.id;
    const organizationId = found.student.organizationId;
    let accessId = "";
    const now = new Date();

    await this.db.transaction(async (tx) => {
      const [currentInvite] = await tx
        .select()
        .from(studentAccessInvites)
        .where(
          and(
            eq(studentAccessInvites.id, found.invite.id),
            eq(studentAccessInvites.status, "pending"),
          ),
        )
        .limit(1);
      if (!currentInvite || currentInvite.expiresAt.getTime() <= now.getTime()) {
        throw new BadRequestException("Convite indisponível.");
      }

      const [currentStudent] = await tx
        .select()
        .from(students)
        .where(and(eq(students.id, studentId), eq(students.status, "active")))
        .limit(1);
      if (!currentStudent) throw new BadRequestException("Aluno inativo não pode aceitar convite.");

      const activation = await this.activationService.activate(tx, {
        organizationId,
        studentId,
        authUserId: userId,
        termsVersion: input.termsVersion,
      });
      accessId = activation.accessId;
      await tx
        .update(studentAccessInvites)
        .set({ status: "accepted", acceptedAt: now, acceptedByUserId: userId, updatedAt: now })
        .where(eq(studentAccessInvites.id, found.invite.id));
    });

    return { studentAccessId: accessId, studentId };
  }

  async me(userId: string): Promise<StudentMeResponse> {
    const access = await this.findActiveAccessForUser(userId);
    if (!access) throw new ForbiddenException("Conta sem acesso de aluno ativo.");

    const [student] = await this.db
      .select()
      .from(students)
      .where(eq(students.id, access.studentId))
      .limit(1);
    if (!student) throw new NotFoundException("Aluno não encontrado.");
    const state = studentReadState({
      status: student.status,
      inactiveAt: student.inactiveAt,
      now: new Date(),
    });
    if (state.blocked) throw new ForbiddenException("Acesso de aluno expirado.");

    const [academy] = await this.db
      .select()
      .from(organization)
      .where(eq(organization.id, access.organizationId))
      .limit(1);
    if (!academy) throw new NotFoundException("Academia não encontrada.");

    const groups = await this.activeClassGroupsForStudent(access.organizationId, student.id);
    const upcomingClasses = await this.upcomingClasses(
      access.organizationId,
      groups.map((group) => group.id),
    );

    return {
      academy: {
        id: academy.id,
        name: academy.name,
        logo: academy.logo ?? null,
        phone: academy.phone ?? null,
        instagram: academy.instagram ?? null,
        address: academy.address ?? null,
        pixKeyType: parsePixKeyType(academy.pixKeyType),
        pixKey: academy.pixKey ?? null,
        pixCopyPaste: academy.pixCopyPaste ?? null,
      },
      student: {
        id: student.id,
        name: student.name,
        status: student.status === "inactive" ? "inactive" : "active",
        phone: student.phone ?? null,
        email: student.email ?? null,
        readOnly: state.readOnly,
        blocked: state.blocked,
      },
      classGroups: groups,
      upcomingClasses,
    };
  }

  private async findStudent(organizationId: string, studentId: string): Promise<StudentRow> {
    const [student] = await this.db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.organizationId, organizationId)))
      .limit(1);
    if (!student) throw new NotFoundException("Aluno não encontrado.");
    return student;
  }

  private async findActiveAccessForStudent(studentId: string): Promise<AccessRow | null> {
    const [row] = await this.db
      .select()
      .from(studentAccess)
      .where(and(eq(studentAccess.studentId, studentId), eq(studentAccess.status, "active")))
      .limit(1);
    return row ?? null;
  }

  private async findActiveAccessForUser(userId: string): Promise<AccessRow | null> {
    const [row] = await this.db
      .select()
      .from(studentAccess)
      .where(and(eq(studentAccess.authUserId, userId), eq(studentAccess.status, "active")))
      .limit(1);
    return row ?? null;
  }

  private async findInviteByToken(token: string): Promise<{
    invite: InviteRow;
    student: StudentRow;
    academy: typeof organization.$inferSelect;
  } | null> {
    const [invite] = await this.db
      .select()
      .from(studentAccessInvites)
      .where(eq(studentAccessInvites.tokenHash, hashToken(token)))
      .limit(1);
    if (!invite) return null;

    const [student] = await this.db
      .select()
      .from(students)
      .where(eq(students.id, invite.studentId))
      .limit(1);
    const [academy] = await this.db
      .select()
      .from(organization)
      .where(eq(organization.id, invite.organizationId))
      .limit(1);
    if (!student || !academy) return null;
    return { invite, student, academy };
  }

  private async activeClassGroupsForStudent(organizationId: string, studentId: string) {
    const rows = await this.db
      .select({ id: classGroups.id, name: classGroups.name })
      .from(studentClassGroups)
      .innerJoin(classGroups, eq(classGroups.id, studentClassGroups.classGroupId))
      .where(
        and(
          eq(studentClassGroups.organizationId, organizationId),
          eq(studentClassGroups.studentId, studentId),
          isNull(studentClassGroups.activeUntil),
          eq(classGroups.status, "active"),
        ),
      )
      .orderBy(classGroups.name);
    return rows;
  }

  private async upcomingClasses(
    organizationId: string,
    classGroupIds: string[],
  ): Promise<StudentMeResponse["upcomingClasses"]> {
    if (classGroupIds.length === 0) return [];
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const today = now.toISOString().slice(0, 10);
    const dates = Array.from({ length: 8 }, (_, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() + index);
      return date.toISOString().slice(0, 10);
    });

    const schedules = await this.db
      .select({
        scheduleId: classGroupSchedules.id,
        classGroupId: classGroups.id,
        classGroupName: classGroups.name,
        weekday: classGroupSchedules.weekday,
        startTime: classGroupSchedules.startTime,
        durationMinutes: classGroups.defaultDurationMinutes,
      })
      .from(classGroupSchedules)
      .innerJoin(classGroups, eq(classGroups.id, classGroupSchedules.classGroupId))
      .where(
        and(
          eq(classGroupSchedules.organizationId, organizationId),
          inArray(classGroups.id, classGroupIds),
        ),
      );

    const cancellations = await this.db
      .select()
      .from(classCancellations)
      .where(
        and(
          eq(classCancellations.organizationId, organizationId),
          inArray(classCancellations.classGroupId, classGroupIds),
          isNull(classCancellations.revertedAt),
        ),
      );

    const adHocRows = await this.db
      .select({
        id: classSessions.id,
        status: classSessions.status,
        classGroupId: classSessions.classGroupId,
        classGroupName: classGroups.name,
        scheduledStartAt: classSessions.scheduledStartAt,
        durationMinutes: classSessions.durationMinutes,
      })
      .from(classSessions)
      .innerJoin(classGroups, eq(classGroups.id, classSessions.classGroupId))
      .where(
        and(
          eq(classSessions.organizationId, organizationId),
          inArray(classSessions.classGroupId, classGroupIds),
          gte(classSessions.scheduledStartAt, now),
          lt(classSessions.scheduledStartAt, end),
        ),
      );

    const recurring = schedules.flatMap((schedule) =>
      dates
        .filter((date) => weekdayForDate(date) === schedule.weekday)
        .map((date) => {
          const scheduledStartAt = new Date(`${date}T${schedule.startTime}:00.000Z`);
          const cancellation = cancellations.find(
            (item) =>
              item.classGroupScheduleId === schedule.scheduleId && item.occurrenceDate === date,
          );
          return {
            id: `recurring:${schedule.scheduleId}:${date}`,
            status: cancellation ? ("cancelled" as const) : ("scheduled" as const),
            source: "recurring" as const,
            classGroupId: schedule.classGroupId,
            classGroupName: schedule.classGroupName,
            scheduledStartAt: scheduledStartAt.toISOString(),
            durationMinutes: schedule.durationMinutes,
          };
        })
        .filter(
          (item) => new Date(item.scheduledStartAt) >= now && new Date(item.scheduledStartAt) < end,
        ),
    );

    const adHoc = adHocRows.map((row) => ({
      id: row.id,
      status: parseClassStatus(row.status),
      source: "ad_hoc" as const,
      classGroupId: row.classGroupId,
      classGroupName: row.classGroupName,
      scheduledStartAt: row.scheduledStartAt.toISOString(),
      durationMinutes: row.durationMinutes,
    }));

    return [...recurring, ...adHoc].sort((a, b) =>
      a.scheduledStartAt.localeCompare(b.scheduledStartAt),
    );
  }
}

function emptyAccessState(): StudentAccessState {
  return { status: "none", inviteId: null, expiresAt: null, accessId: null };
}

function webAppUrl(): string {
  return process.env.WEB_APP_URL ?? "http://localhost:5173";
}

function weekdayForDate(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

function parsePixKeyType(value: string | null): "cpf" | "email" | "phone" | "random" | null {
  if (value === "cpf" || value === "email" || value === "phone" || value === "random") return value;
  return null;
}
