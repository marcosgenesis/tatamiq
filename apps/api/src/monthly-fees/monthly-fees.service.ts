import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AdjustMonthlyFeeInput,
  CreateMonthlyFeeInput,
  ListMonthlyFeesResponse,
  ManualPaymentInput,
  MonthlyFee,
  MonthlyFeeDetail,
  PaymentReceipt,
  RejectReceiptInput,
  StudentMonthlyFeesResponse,
  WaiveMonthlyFeeInput,
} from "@tatamiq/contracts";
import {
  type Database,
  monthlyFeeEvents,
  monthlyFees,
  paymentReceipts,
  students,
} from "@tatamiq/database";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import {
  clampDueDay,
  formatDueDate,
  isOverdue,
  validateCanCreateFee,
  validateStatusTransition,
} from "./monthly-fee-rules";

type FeeRow = typeof monthlyFees.$inferSelect;
type EventRow = typeof monthlyFeeEvents.$inferSelect;
type ReceiptRow = typeof paymentReceipts.$inferSelect;

@Injectable()
export class MonthlyFeesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(
    organizationId: string,
    filters: {
      status?: string;
      studentId?: string;
      referenceYear?: number;
      referenceMonth?: number;
    } = {},
  ): Promise<ListMonthlyFeesResponse> {
    const conditions = [eq(monthlyFees.organizationId, organizationId)];

    if (filters.studentId) {
      conditions.push(eq(monthlyFees.studentId, filters.studentId));
    }
    if (filters.referenceYear) {
      conditions.push(eq(monthlyFees.referenceYear, filters.referenceYear));
    }
    if (filters.referenceMonth) {
      conditions.push(eq(monthlyFees.referenceMonth, filters.referenceMonth));
    }

    if (filters.status === "overdue") {
      conditions.push(eq(monthlyFees.status, "open"));
      conditions.push(sql`${monthlyFees.dueDate} < CURRENT_DATE`);
    } else if (filters.status && filters.status !== "all") {
      conditions.push(eq(monthlyFees.status, filters.status));
    }

    const rows = await this.db
      .select({
        fee: monthlyFees,
        studentName: students.name,
      })
      .from(monthlyFees)
      .innerJoin(students, eq(monthlyFees.studentId, students.id))
      .where(and(...conditions))
      .orderBy(monthlyFees.dueDate);

    const allRows = await this.db
      .select({
        status: monthlyFees.status,
        dueDate: monthlyFees.dueDate,
      })
      .from(monthlyFees)
      .where(eq(monthlyFees.organizationId, organizationId));

    const today = new Date();
    let open = 0;
    let overdue = 0;
    let underReview = 0;
    let paid = 0;
    let waived = 0;
    for (const r of allRows) {
      if (r.status === "paid") paid++;
      else if (r.status === "waived") waived++;
      else if (r.status === "under_review") underReview++;
      else if (r.status === "open") {
        if (isOverdue(r.status, r.dueDate, today)) overdue++;
        else open++;
      }
    }

    return {
      fees: rows.map((r) => toFeeDto(r.fee, r.studentName)),
      summary: {
        open,
        overdue,
        underReview,
        paid,
        waived,
        total: allRows.length,
      },
    };
  }

  async create(organizationId: string, input: CreateMonthlyFeeInput): Promise<MonthlyFeeDetail> {
    const student = await this.findStudent(organizationId, input.studentId);
    validateCanCreateFee(student);

    const dueDate = clampDueDay(input.dueDay, input.referenceYear, input.referenceMonth);
    const feeId = crypto.randomUUID();
    const now = new Date();

    try {
      await this.db.insert(monthlyFees).values({
        id: feeId,
        organizationId,
        studentId: input.studentId,
        referenceYear: input.referenceYear,
        referenceMonth: input.referenceMonth,
        amountInCents: input.amountInCents,
        originalAmountInCents: null,
        dueDate: formatDueDate(dueDate),
        status: "open",
        paidAt: null,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("Já existe uma mensalidade para este aluno neste mês.");
      }
      throw error;
    }

    return this.get(organizationId, feeId);
  }

  async get(organizationId: string, id: string): Promise<MonthlyFeeDetail> {
    const [row] = await this.db
      .select({
        fee: monthlyFees,
        studentName: students.name,
      })
      .from(monthlyFees)
      .innerJoin(students, eq(monthlyFees.studentId, students.id))
      .where(and(eq(monthlyFees.id, id), eq(monthlyFees.organizationId, organizationId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException("Mensalidade não encontrada.");
    }

    const events = await this.db
      .select()
      .from(monthlyFeeEvents)
      .where(eq(monthlyFeeEvents.monthlyFeeId, id))
      .orderBy(monthlyFeeEvents.createdAt);

    const receipts = await this.db
      .select()
      .from(paymentReceipts)
      .where(eq(paymentReceipts.monthlyFeeId, id))
      .orderBy(paymentReceipts.createdAt);

    return {
      ...toFeeDto(row.fee, row.studentName),
      events: events.map(toEventDto),
      receipts: receipts.map(toReceiptDto),
    };
  }

  async adjust(
    organizationId: string,
    id: string,
    userId: string,
    input: AdjustMonthlyFeeInput,
  ): Promise<MonthlyFeeDetail> {
    const fee = await this.findFee(organizationId, id);
    validateStatusTransition(fee.status, "adjust");

    const now = new Date();
    await this.db
      .update(monthlyFees)
      .set({
        amountInCents: input.amountInCents,
        originalAmountInCents: fee.originalAmountInCents ?? fee.amountInCents,
        updatedAt: now,
      })
      .where(and(eq(monthlyFees.id, id), eq(monthlyFees.organizationId, organizationId)));

    await this.db.insert(monthlyFeeEvents).values({
      id: crypto.randomUUID(),
      monthlyFeeId: id,
      organizationId,
      type: "adjusted",
      reason: input.reason,
      metadata: {
        previousAmountInCents: fee.amountInCents,
        newAmountInCents: input.amountInCents,
      },
      createdByUserId: userId,
      createdAt: now,
    });

    return this.get(organizationId, id);
  }

  async waive(
    organizationId: string,
    id: string,
    userId: string,
    input: WaiveMonthlyFeeInput,
  ): Promise<MonthlyFeeDetail> {
    const fee = await this.findFee(organizationId, id);
    validateStatusTransition(fee.status, "waive");

    const now = new Date();
    await this.db
      .update(monthlyFees)
      .set({ status: "waived", updatedAt: now })
      .where(and(eq(monthlyFees.id, id), eq(monthlyFees.organizationId, organizationId)));

    await this.db.insert(monthlyFeeEvents).values({
      id: crypto.randomUUID(),
      monthlyFeeId: id,
      organizationId,
      type: "waived",
      reason: input.reason,
      metadata: null,
      createdByUserId: userId,
      createdAt: now,
    });

    return this.get(organizationId, id);
  }

  async manualPayment(
    organizationId: string,
    id: string,
    userId: string,
    input: ManualPaymentInput,
  ): Promise<MonthlyFeeDetail> {
    const fee = await this.findFee(organizationId, id);
    validateStatusTransition(fee.status, "manual_payment");

    const now = new Date();
    await this.db
      .update(monthlyFees)
      .set({ status: "paid", paidAt: now, updatedAt: now })
      .where(and(eq(monthlyFees.id, id), eq(monthlyFees.organizationId, organizationId)));

    const note = input.note?.trim() || null;
    await this.db.insert(monthlyFeeEvents).values({
      id: crypto.randomUUID(),
      monthlyFeeId: id,
      organizationId,
      type: "manual_payment",
      reason: note,
      metadata: null,
      createdByUserId: userId,
      createdAt: now,
    });

    return this.get(organizationId, id);
  }

  async studentFees(
    studentId: string,
    organizationId: string,
  ): Promise<StudentMonthlyFeesResponse> {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const cutoffDate = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

    const rows = await this.db
      .select()
      .from(monthlyFees)
      .where(
        and(
          eq(monthlyFees.studentId, studentId),
          eq(monthlyFees.organizationId, organizationId),
          gte(monthlyFees.dueDate, cutoffDate),
        ),
      )
      .orderBy(desc(monthlyFees.dueDate));

    const feeIds = rows.map((r) => r.id);
    const allReceipts =
      feeIds.length > 0
        ? await this.db
            .select()
            .from(paymentReceipts)
            .where(
              sql`${paymentReceipts.monthlyFeeId} IN (${sql.join(
                feeIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            )
            .orderBy(desc(paymentReceipts.createdAt))
        : [];

    const receiptsByFee = new Map<string, ReceiptRow[]>();
    for (const r of allReceipts) {
      const list = receiptsByFee.get(r.monthlyFeeId) ?? [];
      list.push(r);
      receiptsByFee.set(r.monthlyFeeId, list);
    }

    return {
      fees: rows.map((row) => {
        const feeReceipts = receiptsByFee.get(row.id) ?? [];
        const lastRelevant =
          feeReceipts.find((r) => r.status === "pending") ??
          feeReceipts.find((r) => r.status === "approved") ??
          feeReceipts.find((r) => r.status === "rejected") ??
          null;

        return {
          id: row.id,
          referenceYear: row.referenceYear,
          referenceMonth: row.referenceMonth,
          amountInCents: row.amountInCents,
          dueDate: row.dueDate,
          status: parseStatus(row.status),
          isOverdue: isOverdue(row.status, row.dueDate),
          paidAt: row.paidAt?.toISOString() ?? null,
          lastReceipt: lastRelevant
            ? {
                id: lastRelevant.id,
                status: parseReceiptStatus(lastRelevant.status),
                rejectionReason: lastRelevant.rejectionReason,
                createdAt: lastRelevant.createdAt.toISOString(),
              }
            : null,
        };
      }),
    };
  }

  async listReceipts(organizationId: string, feeId: string): Promise<PaymentReceipt[]> {
    await this.findFee(organizationId, feeId);
    const rows = await this.db
      .select()
      .from(paymentReceipts)
      .where(
        and(
          eq(paymentReceipts.monthlyFeeId, feeId),
          eq(paymentReceipts.organizationId, organizationId),
        ),
      )
      .orderBy(paymentReceipts.createdAt);
    return rows.map(toReceiptDto);
  }

  async approveReceipt(
    organizationId: string,
    feeId: string,
    receiptId: string,
    userId: string,
  ): Promise<MonthlyFeeDetail> {
    await this.findFee(organizationId, feeId);
    const receipt = await this.findReceipt(organizationId, feeId, receiptId);
    if (receipt.status !== "pending") {
      throw new BadRequestException("Comprovante não está pendente.");
    }

    const now = new Date();
    await this.db
      .update(paymentReceipts)
      .set({ status: "approved" })
      .where(eq(paymentReceipts.id, receiptId));

    await this.db
      .update(monthlyFees)
      .set({ status: "paid", paidAt: now, updatedAt: now })
      .where(eq(monthlyFees.id, feeId));

    await this.db.insert(monthlyFeeEvents).values({
      id: crypto.randomUUID(),
      monthlyFeeId: feeId,
      organizationId,
      type: "receipt_approved",
      reason: null,
      metadata: { receiptId },
      createdByUserId: userId,
      createdAt: now,
    });

    return this.get(organizationId, feeId);
  }

  async rejectReceipt(
    organizationId: string,
    feeId: string,
    receiptId: string,
    userId: string,
    input: RejectReceiptInput,
  ): Promise<MonthlyFeeDetail> {
    await this.findFee(organizationId, feeId);
    const receipt = await this.findReceipt(organizationId, feeId, receiptId);
    if (receipt.status !== "pending") {
      throw new BadRequestException("Comprovante não está pendente.");
    }

    const now = new Date();
    await this.db
      .update(paymentReceipts)
      .set({ status: "rejected", rejectionReason: input.reason })
      .where(eq(paymentReceipts.id, receiptId));

    await this.db
      .update(monthlyFees)
      .set({ status: "open", updatedAt: now })
      .where(eq(monthlyFees.id, feeId));

    await this.db.insert(monthlyFeeEvents).values({
      id: crypto.randomUUID(),
      monthlyFeeId: feeId,
      organizationId,
      type: "receipt_rejected",
      reason: input.reason,
      metadata: { receiptId },
      createdByUserId: userId,
      createdAt: now,
    });

    return this.get(organizationId, feeId);
  }

  private async findReceipt(organizationId: string, feeId: string, receiptId: string) {
    const [row] = await this.db
      .select()
      .from(paymentReceipts)
      .where(
        and(
          eq(paymentReceipts.id, receiptId),
          eq(paymentReceipts.monthlyFeeId, feeId),
          eq(paymentReceipts.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException("Comprovante não encontrado.");
    }
    return row;
  }

  private async findFee(organizationId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(monthlyFees)
      .where(and(eq(monthlyFees.id, id), eq(monthlyFees.organizationId, organizationId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException("Mensalidade não encontrada.");
    }

    return row;
  }

  private async findStudent(organizationId: string, studentId: string) {
    const [student] = await this.db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.organizationId, organizationId)))
      .limit(1);

    if (!student) {
      throw new NotFoundException("Aluno não encontrado.");
    }

    return student;
  }
}

function toFeeDto(row: FeeRow, studentName: string): MonthlyFee {
  return {
    id: row.id,
    studentId: row.studentId,
    studentName,
    referenceYear: row.referenceYear,
    referenceMonth: row.referenceMonth,
    amountInCents: row.amountInCents,
    originalAmountInCents: row.originalAmountInCents,
    dueDate: row.dueDate,
    status: parseStatus(row.status),
    isOverdue: isOverdue(row.status, row.dueDate),
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toEventDto(row: EventRow) {
  return {
    id: row.id,
    monthlyFeeId: row.monthlyFeeId,
    type: parseEventType(row.type),
    reason: row.reason,
    metadata: row.metadata as Record<string, unknown> | null,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

function toReceiptDto(row: ReceiptRow) {
  return {
    id: row.id,
    monthlyFeeId: row.monthlyFeeId,
    studentId: row.studentId,
    fileUrl: row.fileUrl,
    fileType: row.fileType,
    fileSizeBytes: row.fileSizeBytes,
    status: parseReceiptStatus(row.status),
    rejectionReason: row.rejectionReason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

function parseStatus(value: string): MonthlyFee["status"] {
  const valid = ["open", "under_review", "paid", "waived"];
  if (valid.includes(value)) return value as MonthlyFee["status"];
  throw new BadRequestException("Status de mensalidade inválido.");
}

function parseEventType(value: string) {
  const valid = ["waived", "adjusted", "receipt_approved", "receipt_rejected", "manual_payment"];
  if (valid.includes(value)) return value as MonthlyFeeDetail["events"][number]["type"];
  throw new BadRequestException("Tipo de evento inválido.");
}

function parseReceiptStatus(value: string) {
  const valid = ["pending", "approved", "rejected"];
  if (valid.includes(value)) return value as MonthlyFeeDetail["receipts"][number]["status"];
  throw new BadRequestException("Status de comprovante inválido.");
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}
