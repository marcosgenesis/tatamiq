import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ConfirmQrAttendanceInput, ConfirmQrAttendanceResponse } from "@tatamiq/contracts";
import {
  attendances,
  classGroups,
  classSessions,
  type Database,
  studentAccess,
  studentClassGroups,
  students,
} from "@tatamiq/database";
import { and, eq, isNull } from "drizzle-orm";
import { resolveQrTokenSecret } from "../auth";
import { parseClassStatus } from "../class-status";
import { verifyQrToken } from "../classes/qr-token";
import { DATABASE } from "../database/database.module";

@Injectable()
export class QrAttendanceService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async confirmQrAttendance(
    userId: string,
    input: ConfirmQrAttendanceInput,
  ): Promise<ConfirmQrAttendanceResponse> {
    const access = await this.findActiveAccessForUser(userId);
    if (!access) throw new ForbiddenException("Conta sem acesso de aluno ativo.");

    const claims = verifyQrToken(input.token, resolveQrTokenSecret());
    if (!claims) throw new BadRequestException("QR Code inválido ou expirado.");
    if (claims.organizationId !== access.organizationId) {
      throw new ForbiddenException("QR Code não pertence à academia do aluno.");
    }

    const [student] = await this.db
      .select()
      .from(students)
      .where(eq(students.id, access.studentId))
      .limit(1);
    if (!student) throw new NotFoundException("Aluno não encontrado.");
    if (student.status !== "active") {
      throw new ForbiddenException("Aluno inativo não pode confirmar presença.");
    }

    const [session] = await this.db
      .select({
        id: classSessions.id,
        organizationId: classSessions.organizationId,
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
        and(
          eq(classSessions.id, claims.classSessionId),
          eq(classSessions.organizationId, access.organizationId),
        ),
      )
      .limit(1);

    if (!session) throw new NotFoundException("Aula não encontrada.");
    if (session.status !== "active" || !session.actualStartAt) {
      throw new BadRequestException("QR Code fechado para esta aula.");
    }
    const qrClosesAt = new Date(
      session.actualStartAt.getTime() + (session.durationMinutes + 15) * 60_000,
    );
    if (Date.now() > qrClosesAt.getTime()) {
      throw new BadRequestException("QR Code expirado para esta aula.");
    }

    const attendanceId = crypto.randomUUID();
    const now = new Date();

    await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(attendances)
        .where(
          and(
            eq(attendances.classSessionId, session.id),
            eq(attendances.studentId, access.studentId),
            isNull(attendances.invalidatedAt),
          ),
        )
        .limit(1);
      if (existing) throw new BadRequestException("Aluno já possui presença válida nesta aula.");

      await tx.insert(attendances).values({
        id: attendanceId,
        organizationId: access.organizationId,
        classSessionId: session.id,
        studentId: access.studentId,
        source: "qr",
        invalidatedAt: null,
        invalidatedByUserId: null,
        invalidationReason: null,
        createdByUserId: userId,
        createdAt: now,
      });
    });

    const isOutOfGroup = await this.isOutOfGroup(
      access.organizationId,
      session.classGroupId,
      access.studentId,
    );

    return {
      attendance: {
        id: attendanceId,
        studentId: access.studentId,
        studentName: student.name,
        source: "qr",
        isOutOfGroup,
        invalidatedAt: null,
        invalidationReason: null,
        createdAt: now.toISOString(),
      },
      classSession: toClassSessionDto(session),
    };
  }

  private async findActiveAccessForUser(userId: string) {
    const [row] = await this.db
      .select()
      .from(studentAccess)
      .where(and(eq(studentAccess.authUserId, userId), eq(studentAccess.status, "active")))
      .limit(1);
    return row ?? null;
  }

  private async isOutOfGroup(
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

function toClassSessionDto(row: {
  id: string;
  classGroupId: string;
  classGroupName: string;
  kind: string;
  status: string;
  scheduledStartAt: Date;
  actualStartAt: Date | null;
  durationMinutes: number;
  endedAt: Date | null;
}): ConfirmQrAttendanceResponse["classSession"] {
  return {
    id: row.id,
    classGroupId: row.classGroupId,
    classGroupName: row.classGroupName,
    kind: row.kind === "ad_hoc" ? "ad_hoc" : "recurring",
    status: parseClassStatus(row.status),
    scheduledStartAt: row.scheduledStartAt.toISOString(),
    actualStartAt: row.actualStartAt?.toISOString() ?? null,
    durationMinutes: row.durationMinutes,
    endedAt: row.endedAt?.toISOString() ?? null,
  };
}
