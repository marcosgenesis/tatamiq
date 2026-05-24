import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreatePromotionInput,
  DismissEligibilityInput,
  EligibilityType,
  EligibleStudent,
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
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { calculateAge, calculateEligibility, monthsBetween } from "./eligibility-rules";

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

    const now = new Date();
    const eligible: EligibleStudent[] = [];

    for (const { student, belt } of studentRows) {
      const lastPromotion = await this.db
        .select({ promotedAt: promotions.promotedAt })
        .from(promotions)
        .where(eq(promotions.studentId, student.id))
        .orderBy(desc(promotions.promotedAt))
        .limit(1);

      const referenceDate = lastPromotion[0]
        ? new Date(lastPromotion[0].promotedAt)
        : new Date(student.enrollmentDate);

      const validAttendances = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(attendances)
        .where(
          and(
            eq(attendances.studentId, student.id),
            isNull(attendances.invalidatedAt),
            gte(attendances.createdAt, referenceDate),
          ),
        );

      const attendanceCount = validAttendances[0]?.count ?? 0;
      const months = monthsBetween(referenceDate, now);
      const age = calculateAge(new Date(student.birthDate), now);

      const result = calculateEligibility(
        {
          maxDegrees: belt.maxDegrees,
          minMonthsForNextDegree: belt.minMonthsForNextDegree,
          minAttendancesForNextDegree: belt.minAttendancesForNextDegree,
          minMonthsForNextBelt: belt.minMonthsForNextBelt,
          minAttendancesForNextBelt: belt.minAttendancesForNextBelt,
          path: belt.path as "adult" | "child",
        },
        {
          currentDegree: student.currentDegree,
          monthsSinceReference: months,
          attendancesSinceReference: attendanceCount,
          age,
          childToAdultAge,
          degreeEligibilityDismissedUntil: student.degreeEligibilityDismissedUntil,
          beltEligibilityDismissedUntil: student.beltEligibilityDismissedUntil,
          transitionDismissedUntil: student.transitionDismissedUntil,
        },
        now,
      );

      const base = {
        id: student.id,
        name: student.name,
        currentBeltId: belt.id,
        currentBeltName: belt.name,
        currentBeltPath: belt.path as "adult" | "child",
        currentDegree: student.currentDegree,
        monthsSinceReference: months,
        attendancesSinceReference: attendanceCount,
      };

      if (result.degreeEligible && (!type || type === "degree")) {
        eligible.push({
          ...base,
          eligibilityType: "degree",
          requiredMonths: belt.minMonthsForNextDegree,
          requiredAttendances: belt.minAttendancesForNextDegree,
        });
      }

      if (result.beltEligible && (!type || type === "belt")) {
        eligible.push({
          ...base,
          eligibilityType: "belt",
          requiredMonths: belt.minMonthsForNextBelt,
          requiredAttendances: belt.minAttendancesForNextBelt,
        });
      }

      if (result.transitionEligible && (!type || type === "transition")) {
        eligible.push({
          ...base,
          eligibilityType: "transition",
          requiredMonths: 0,
          requiredAttendances: 0,
        });
      }
    }

    return { students: eligible };
  }

  async summary(organizationId: string): Promise<GraduationSummaryResponse> {
    const { students: all } = await this.listEligibleStudents(organizationId);
    return {
      degree: all.filter((s) => s.eligibilityType === "degree").length,
      belt: all.filter((s) => s.eligibilityType === "belt").length,
      transition: all.filter((s) => s.eligibilityType === "transition").length,
    };
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
