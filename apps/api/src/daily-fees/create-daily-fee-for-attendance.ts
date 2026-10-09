import {
  attendances,
  classSessions,
  type Database,
  dailyFees,
  organization,
  studentBillingPeriods,
} from "@appdosensei/database";
import { BadRequestException } from "@nestjs/common";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function createDailyFeeForAttendance(
  tx: Transaction,
  input: { organizationId: string; studentId: string; occurredAt: Date },
): Promise<void> {
  const attendanceDate = dateInSaoPaulo(input.occurredAt);
  const [period] = await tx
    .select({ method: studentBillingPeriods.method })
    .from(studentBillingPeriods)
    .where(
      and(
        eq(studentBillingPeriods.studentId, input.studentId),
        eq(studentBillingPeriods.organizationId, input.organizationId),
        lte(studentBillingPeriods.startsOn, attendanceDate),
        or(isNull(studentBillingPeriods.endsOn), gte(studentBillingPeriods.endsOn, attendanceDate)),
      ),
    )
    .limit(1);
  if (period?.method !== "daily") return;

  const [academy] = await tx
    .select({ dailyAmountInCents: organization.dailyAmountInCents })
    .from(organization)
    .where(eq(organization.id, input.organizationId))
    .limit(1);
  if (!academy?.dailyAmountInCents || academy.dailyAmountInCents <= 0) return;

  const now = new Date();
  await tx
    .insert(dailyFees)
    .values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      studentId: input.studentId,
      attendanceDate,
      amountInCents: academy.dailyAmountInCents,
      status: "open",
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

export function dateInSaoPaulo(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function resolveDailyFeeAfterAttendanceInvalidation(
  tx: Transaction,
  input: { organizationId: string; studentId: string; attendanceDate: string },
): Promise<void> {
  const remaining = await tx
    .select({ actualStartAt: classSessions.actualStartAt })
    .from(attendances)
    .innerJoin(classSessions, eq(classSessions.id, attendances.classSessionId))
    .where(
      and(
        eq(attendances.organizationId, input.organizationId),
        eq(attendances.studentId, input.studentId),
        isNull(attendances.invalidatedAt),
      ),
    );
  if (
    remaining.some(
      (row) => row.actualStartAt && dateInSaoPaulo(row.actualStartAt) === input.attendanceDate,
    )
  )
    return;

  const [fee] = await tx
    .select()
    .from(dailyFees)
    .where(
      and(
        eq(dailyFees.studentId, input.studentId),
        eq(dailyFees.attendanceDate, input.attendanceDate),
      ),
    )
    .for("update")
    .limit(1);
  if (!fee || fee.status === "waived") return;
  if (fee.status !== "open") {
    throw new BadRequestException(
      "Esta diária já recebeu pagamento e exige compensação antes da invalidação.",
    );
  }
  await tx
    .update(dailyFees)
    .set({ status: "waived", updatedAt: new Date() })
    .where(eq(dailyFees.id, fee.id));
}
