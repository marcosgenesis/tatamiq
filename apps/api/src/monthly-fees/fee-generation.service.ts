import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { type Database, member, monthlyFees, students } from "@tatamiq/database";
import { and, eq, sql } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { clampDueDay, formatDueDate } from "./monthly-fee-rules";

@Injectable()
export class FeeGenerationService {
  private readonly logger = new Logger(FeeGenerationService.name);

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Cron("0 6 * * *", { timeZone: "America/Sao_Paulo" })
  async cronGenerate(): Promise<void> {
    this.logger.log("Starting daily fee generation...");
    const orgs = await this.db
      .selectDistinct({ organizationId: students.organizationId })
      .from(students)
      .where(eq(students.status, "active"));

    let total = 0;
    for (const { organizationId } of orgs) {
      const count = await this.generateForOrganization(organizationId, 5);
      total += count;
    }
    this.logger.log(`Daily fee generation complete. Created ${total} fee(s).`);
  }

  async catchUp(organizationId: string): Promise<number> {
    return this.generateForOrganization(organizationId, null);
  }

  private async generateForOrganization(
    organizationId: string,
    daysAheadLimit: number | null,
  ): Promise<number> {
    if (!(await this.organizationHasOwner(organizationId))) {
      this.logger.warn(`Skipping fee generation for ownerless organization ${organizationId}.`);
      return 0;
    }

    const now = new Date();
    const spNow = toSaoPauloDate(now);
    const currentYear = spNow.getFullYear();
    const currentMonth = spNow.getMonth() + 1;
    const currentDay = spNow.getDate();

    const eligibleStudents = await this.db
      .select({
        id: students.id,
        monthlyAmountInCents: students.monthlyAmountInCents,
        monthlyDueDay: students.monthlyDueDay,
      })
      .from(students)
      .where(
        and(
          eq(students.organizationId, organizationId),
          eq(students.status, "active"),
          sql`${students.monthlyAmountInCents} IS NOT NULL`,
          sql`${students.monthlyDueDay} IS NOT NULL`,
        ),
      );

    let created = 0;
    for (const student of eligibleStudents) {
      const dueDay = student.monthlyDueDay!;
      const amount = student.monthlyAmountInCents!;

      const dueDate = clampDueDay(dueDay, currentYear, currentMonth);
      const dueDateDay = dueDate.getDate();

      if (daysAheadLimit !== null) {
        const daysUntilDue = dueDateDay - currentDay;
        if (daysUntilDue < 0 || daysUntilDue > daysAheadLimit) continue;
      } else {
        if (dueDateDay < currentDay) continue;
      }

      const existing = await this.db
        .select({ id: monthlyFees.id })
        .from(monthlyFees)
        .where(
          and(
            eq(monthlyFees.studentId, student.id),
            eq(monthlyFees.referenceYear, currentYear),
            eq(monthlyFees.referenceMonth, currentMonth),
          ),
        )
        .limit(1);

      if (existing.length > 0) continue;

      try {
        await this.db.insert(monthlyFees).values({
          id: crypto.randomUUID(),
          organizationId,
          studentId: student.id,
          referenceYear: currentYear,
          referenceMonth: currentMonth,
          amountInCents: amount,
          originalAmountInCents: null,
          dueDate: formatDueDate(dueDate),
          status: "open",
          paidAt: null,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      } catch {
        // unique constraint — skip silently
      }
    }

    return created;
  }

  private async organizationHasOwner(organizationId: string): Promise<boolean> {
    const owners = await this.db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.role, "owner")))
      .limit(1);

    return owners.length > 0;
  }
}

function toSaoPauloDate(date: Date): Date {
  const sp = date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [y, m, d] = sp.split("-").map(Number);
  return new Date(y, m - 1, d);
}
