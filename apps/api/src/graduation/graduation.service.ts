import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreatePromotionInput,
  DismissEligibilityInput,
  EligibilityType,
  GraduationSummaryResponse,
  ListEligibleStudentsResponse,
  ListPromotionsResponse,
  PromotionDto,
  StudentGraduationResponse,
} from "@tatamiq/contracts";
import {
  attendances,
  belts,
  type Database,
  organization,
  promotions,
  students,
} from "@tatamiq/database";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { projectGraduationEligibility } from "./graduation-eligibility-projection";

@Injectable()
export class GraduationService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async createPromotion(
    organizationId: string,
    studentId: string,
    userId: string,
    input: CreatePromotionInput,
  ): Promise<PromotionDto> {
    const student = await this.findStudent(organizationId, studentId);
    const newBelt = await this.findBelt(organizationId, input.newBeltId);
    if (!newBelt) throw new BadRequestException("Faixa de destino não encontrada.");

    if (input.newDegree > newBelt.maxDegrees) {
      throw new BadRequestException(
        `Grau ${input.newDegree} excede o máximo (${newBelt.maxDegrees}) para ${newBelt.name}.`,
      );
    }

    const previousBelt = await this.findBelt(organizationId, student.currentBeltId);
    const id = crypto.randomUUID();

    await this.db.transaction(async (tx) => {
      await tx.insert(promotions).values({
        id,
        organizationId,
        studentId,
        previousBeltId: student.currentBeltId,
        previousDegree: student.currentDegree,
        newBeltId: input.newBeltId,
        newDegree: input.newDegree,
        promotedAt: input.promotedAt,
        promotedByUserId: userId,
        note: input.note || null,
      });

      await tx
        .update(students)
        .set({
          currentBeltId: input.newBeltId,
          currentDegree: input.newDegree,
          degreeEligibilityDismissedUntil: null,
          degreeEligibilityDismissalReason: null,
          beltEligibilityDismissedUntil: null,
          beltEligibilityDismissalReason: null,
          transitionDismissedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(students.id, studentId));
    });

    return {
      id,
      studentId,
      previousBeltId: student.currentBeltId,
      previousBeltName: previousBelt?.name ?? null,
      previousDegree: student.currentDegree,
      newBeltId: input.newBeltId,
      newBeltName: newBelt.name,
      newDegree: input.newDegree,
      promotedAt: input.promotedAt,
      promotedByUserId: userId,
      note: input.note || null,
      createdAt: new Date().toISOString(),
    };
  }

  async listPromotions(organizationId: string, studentId: string): Promise<ListPromotionsResponse> {
    const rows = await this.db
      .select({
        promotion: promotions,
        newBeltName: belts.name,
      })
      .from(promotions)
      .innerJoin(belts, eq(promotions.newBeltId, belts.id))
      .where(
        and(eq(promotions.organizationId, organizationId), eq(promotions.studentId, studentId)),
      )
      .orderBy(desc(promotions.promotedAt), desc(promotions.createdAt));

    const previousBeltIds = rows
      .map((r) => r.promotion.previousBeltId)
      .filter((id): id is string => id !== null);

    const previousBelts = new Map<string, string>();
    if (previousBeltIds.length > 0) {
      const beltRows = await this.db
        .select({ id: belts.id, name: belts.name })
        .from(belts)
        .where(
          sql`${belts.id} IN (${sql.join(
            previousBeltIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
      for (const b of beltRows) previousBelts.set(b.id, b.name);
    }

    return {
      promotions: rows.map((r) => ({
        id: r.promotion.id,
        studentId: r.promotion.studentId,
        previousBeltId: r.promotion.previousBeltId,
        previousBeltName: r.promotion.previousBeltId
          ? (previousBelts.get(r.promotion.previousBeltId) ?? null)
          : null,
        previousDegree: r.promotion.previousDegree,
        newBeltId: r.promotion.newBeltId,
        newBeltName: r.newBeltName,
        newDegree: r.promotion.newDegree,
        promotedAt: r.promotion.promotedAt,
        promotedByUserId: r.promotion.promotedByUserId,
        note: r.promotion.note,
        createdAt: r.promotion.createdAt.toISOString(),
      })),
    };
  }

  async listEligibleStudents(
    organizationId: string,
    type?: EligibilityType,
  ): Promise<ListEligibleStudentsResponse> {
    const projection = await this.computeEligibilityProjection(organizationId);

    return {
      students: type
        ? projection.students.filter((student) => student.eligibilityType === type)
        : projection.students,
      summary: projection.summary,
    };
  }

  async summary(organizationId: string): Promise<GraduationSummaryResponse> {
    return (await this.computeEligibilityProjection(organizationId)).summary;
  }

  async dismissEligibility(
    organizationId: string,
    studentId: string,
    input: DismissEligibilityInput,
  ): Promise<void> {
    await this.findStudent(organizationId, studentId);

    const dismissedUntil = new Date();
    dismissedUntil.setDate(dismissedUntil.getDate() + (input.days ?? 30));

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (input.type === "degree") {
      updates.degreeEligibilityDismissedUntil = dismissedUntil;
      updates.degreeEligibilityDismissalReason = input.reason || null;
    } else if (input.type === "belt") {
      updates.beltEligibilityDismissedUntil = dismissedUntil;
      updates.beltEligibilityDismissalReason = input.reason || null;
    } else {
      updates.transitionDismissedUntil = dismissedUntil;
    }

    await this.db.update(students).set(updates).where(eq(students.id, studentId));
  }

  async studentGraduation(studentId: string): Promise<StudentGraduationResponse> {
    const [row] = await this.db
      .select({ student: students, belt: belts })
      .from(students)
      .innerJoin(belts, eq(students.currentBeltId, belts.id))
      .where(eq(students.id, studentId))
      .limit(1);

    if (!row) throw new NotFoundException("Aluno não encontrado.");

    const { promotions: history } = await this.listPromotions(
      row.student.organizationId,
      studentId,
    );

    return {
      currentBelt: {
        id: row.belt.id,
        name: row.belt.name,
        path: row.belt.path as "adult" | "child",
        position: row.belt.position,
      },
      currentDegree: row.student.currentDegree,
      promotions: history,
    };
  }

  private async computeEligibilityProjection(organizationId: string) {
    const org = await this.db
      .select({ childToAdultAge: organization.childToAdultAge })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);
    const childToAdultAge = org[0]?.childToAdultAge ?? 16;

    const studentRows = await this.db
      .select({
        student: students,
        belt: belts,
      })
      .from(students)
      .innerJoin(belts, eq(students.currentBeltId, belts.id))
      .where(and(eq(students.organizationId, organizationId), eq(students.status, "active")));

    if (studentRows.length === 0) {
      return projectGraduationEligibility([], childToAdultAge);
    }

    const studentIds = studentRows.map(({ student }) => student.id);

    const promotionRows = await this.db
      .select({ studentId: promotions.studentId, promotedAt: promotions.promotedAt })
      .from(promotions)
      .where(
        and(
          eq(promotions.organizationId, organizationId),
          inArray(promotions.studentId, studentIds),
        ),
      )
      .orderBy(desc(promotions.promotedAt), desc(promotions.createdAt));

    const attendanceRows = await this.db
      .select({
        studentId: attendances.studentId,
        createdAt: attendances.createdAt,
        invalidatedAt: attendances.invalidatedAt,
      })
      .from(attendances)
      .where(
        and(
          eq(attendances.organizationId, organizationId),
          inArray(attendances.studentId, studentIds),
        ),
      );

    const latestPromotionByStudent = new Map<string, string>();
    for (const row of promotionRows) {
      if (!latestPromotionByStudent.has(row.studentId)) {
        latestPromotionByStudent.set(row.studentId, row.promotedAt);
      }
    }

    const attendancesByStudent = new Map<
      string,
      Array<{ createdAt: Date; invalidatedAt: Date | null }>
    >();
    for (const row of attendanceRows) {
      const existing = attendancesByStudent.get(row.studentId) ?? [];
      existing.push({ createdAt: row.createdAt, invalidatedAt: row.invalidatedAt });
      attendancesByStudent.set(row.studentId, existing);
    }

    return projectGraduationEligibility(
      studentRows.map(({ student, belt }) => ({
        student: {
          id: student.id,
          name: student.name,
          birthDate: student.birthDate,
          enrollmentDate: student.enrollmentDate,
          currentDegree: student.currentDegree,
          degreeEligibilityDismissedUntil: student.degreeEligibilityDismissedUntil,
          beltEligibilityDismissedUntil: student.beltEligibilityDismissedUntil,
          transitionDismissedUntil: student.transitionDismissedUntil,
        },
        belt: {
          id: belt.id,
          name: belt.name,
          path: belt.path as "adult" | "child",
          maxDegrees: belt.maxDegrees,
          minMonthsForNextDegree: belt.minMonthsForNextDegree,
          minAttendancesForNextDegree: belt.minAttendancesForNextDegree,
          minMonthsForNextBelt: belt.minMonthsForNextBelt,
          minAttendancesForNextBelt: belt.minAttendancesForNextBelt,
        },
        latestPromotionAt: latestPromotionByStudent.get(student.id) ?? null,
        attendances: attendancesByStudent.get(student.id) ?? [],
      })),
      childToAdultAge,
    );
  }

  private async findStudent(organizationId: string, studentId: string) {
    const [student] = await this.db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.organizationId, organizationId)))
      .limit(1);

    if (!student) throw new NotFoundException("Aluno não encontrado.");
    return student;
  }

  private async findBelt(organizationId: string, beltId: string) {
    const [belt] = await this.db
      .select()
      .from(belts)
      .where(and(eq(belts.id, beltId), eq(belts.organizationId, organizationId)))
      .limit(1);

    return belt ?? null;
  }
}
