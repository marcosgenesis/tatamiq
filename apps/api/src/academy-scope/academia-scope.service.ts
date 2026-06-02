import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { type Database, monthlyFees, paymentReceipts, students } from "@tatamiq/database";
import { and, eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";

type StudentRow = typeof students.$inferSelect;
type MonthlyFeeRow = typeof monthlyFees.$inferSelect;
type PaymentReceiptRow = typeof paymentReceipts.$inferSelect;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type ScopeDatabase = Database | Transaction;

@Injectable()
export class AcademiaScope {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async assertStudentBelongsToAcademia(
    organizationId: string,
    studentId: string,
    db: ScopeDatabase = this.db,
  ): Promise<StudentRow> {
    const [student] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.organizationId, organizationId)))
      .limit(1);

    if (!student) throw new NotFoundException("Aluno não encontrado.");
    return student;
  }

  async assertMonthlyFeeBelongsToAcademia(
    organizationId: string,
    monthlyFeeId: string,
    db: ScopeDatabase = this.db,
  ): Promise<MonthlyFeeRow> {
    const [fee] = await db
      .select()
      .from(monthlyFees)
      .where(and(eq(monthlyFees.id, monthlyFeeId), eq(monthlyFees.organizationId, organizationId)))
      .limit(1);

    if (!fee) throw new NotFoundException("Mensalidade não encontrada.");
    return fee;
  }

  async assertStudentMonthlyFeeBelongsToAcademia(
    organizationId: string,
    studentId: string,
    monthlyFeeId: string,
    db: ScopeDatabase = this.db,
  ): Promise<MonthlyFeeRow> {
    const [fee] = await db
      .select()
      .from(monthlyFees)
      .where(
        and(
          eq(monthlyFees.id, monthlyFeeId),
          eq(monthlyFees.organizationId, organizationId),
          eq(monthlyFees.studentId, studentId),
        ),
      )
      .limit(1);

    if (!fee) throw new NotFoundException("Mensalidade não encontrada.");
    return fee;
  }

  async assertPixReceiptBelongsToAcademia(
    organizationId: string,
    receiptId: string,
    expectedMonthlyFeeId?: string,
    db: ScopeDatabase = this.db,
  ): Promise<PaymentReceiptRow> {
    const conditions = [
      eq(paymentReceipts.id, receiptId),
      eq(paymentReceipts.organizationId, organizationId),
    ];

    if (expectedMonthlyFeeId) {
      conditions.push(eq(paymentReceipts.monthlyFeeId, expectedMonthlyFeeId));
    }

    const [receipt] = await db
      .select()
      .from(paymentReceipts)
      .where(and(...conditions))
      .limit(1);

    if (!receipt) throw new NotFoundException("Comprovante não encontrado.");
    return receipt;
  }
}
