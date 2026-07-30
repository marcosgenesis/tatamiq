import { dailyFees, organization, studentBillingPeriods, type Database } from "@tatamiq/database";
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
    .where(and(
      eq(studentBillingPeriods.studentId, input.studentId),
      eq(studentBillingPeriods.organizationId, input.organizationId),
      lte(studentBillingPeriods.startsOn, attendanceDate),
      or(isNull(studentBillingPeriods.endsOn), gte(studentBillingPeriods.endsOn, attendanceDate)),
    ))
    .limit(1);
  if (!period || period.method !== "daily") return;

  const [academy] = await tx
    .select({ dailyAmountInCents: organization.dailyAmountInCents })
    .from(organization)
    .where(eq(organization.id, input.organizationId))
    .limit(1);
  if (!academy?.dailyAmountInCents || academy.dailyAmountInCents <= 0) return;

  const now = new Date();
  await tx.insert(dailyFees).values({
    id: crypto.randomUUID(), organizationId: input.organizationId, studentId: input.studentId,
    attendanceDate, amountInCents: academy.dailyAmountInCents, status: "open", paidAt: null,
    createdAt: now, updatedAt: now,
  }).onConflictDoNothing();
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
