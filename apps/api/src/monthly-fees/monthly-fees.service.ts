import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AdjustMonthlyFeeInput,
  ConfirmReceiptInput,
  CreateMonthlyFeeInput,
  ListMonthlyFeesResponse,
  ManualPaymentInput,
  MonthlyFee,
  MonthlyFeeDetail,
  PaymentReceipt,
  ReceiptViewUrlResponse,
  RejectReceiptInput,
  StudentMonthlyFeesResponse,
  UploadUrlResponse,
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
import { MonthlyFeeLifecycle } from "./monthly-fee-lifecycle";
import { clampDueDay, formatDueDate, isOverdue, validateCanCreateFee } from "./monthly-fee-rules";
import { R2StorageService } from "./r2-storage.service";

type FeeRow = typeof monthlyFees.$inferSelect;
type EventRow = typeof monthlyFeeEvents.$inferSelect;
type ReceiptRow = typeof paymentReceipts.$inferSelect;

@Injectable()
export class MonthlyFeesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(R2StorageService) private readonly r2: R2StorageService,
    @Inject(MonthlyFeeLifecycle) private readonly lifecycle: MonthlyFeeLifecycle,
  ) {}

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
    await this.lifecycle.adjust(organizationId, id, userId, input);
    return this.get(organizationId, id);
  }

  async waive(
    organizationId: string,
    id: string,
    userId: string,
    input: WaiveMonthlyFeeInput,
  ): Promise<MonthlyFeeDetail> {
    await this.lifecycle.waive(organizationId, id, userId, input);
    return this.get(organizationId, id);
  }

  async manualPayment(
    organizationId: string,
    id: string,
    userId: string,
    input: ManualPaymentInput,
  ): Promise<MonthlyFeeDetail> {
    await this.lifecycle.recordManualPayment(organizationId, id, userId, input);
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
                note: lastRelevant.note,
                createdAt: lastRelevant.createdAt.toISOString(),
              }
            : null,
        };
      }),
    };
  }

  async generateUploadUrl(
    organizationId: string,
    feeId: string,
    contentType: string,
    studentId?: string,
  ): Promise<UploadUrlResponse> {
    const fee = studentId
      ? await this.findStudentFee(organizationId, studentId, feeId)
      : await this.findFee(organizationId, feeId);
    this.validateReceiptSubmissionStatus(fee.status);
    this.validateReceiptFileType(contentType);

    const fileKey = `receipts/${organizationId}/${feeId}/${crypto.randomUUID()}`;
    const uploadUrl = await this.r2.generatePresignedUrl(fileKey, contentType);

    return { uploadUrl, fileKey };
  }

  async confirmReceipt(
    organizationId: string,
    feeId: string,
    userId: string,
    input: ConfirmReceiptInput,
    studentId?: string,
  ): Promise<MonthlyFeeDetail> {
    this.validateReceiptFileType(input.fileType);

    if (input.fileSizeBytes > 10 * 1024 * 1024) {
      throw new BadRequestException("Arquivo excede o limite de 10 MB.");
    }

    await this.lifecycle.submitReceipt(organizationId, feeId, userId, input, studentId);
    return this.get(organizationId, feeId);
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

  async receiptViewUrl(
    organizationId: string,
    feeId: string,
    receiptId: string,
    studentId?: string,
  ): Promise<ReceiptViewUrlResponse> {
    if (studentId) await this.findStudentFee(organizationId, studentId, feeId);
    else await this.findFee(organizationId, feeId);

    const receipt = await this.findReceipt(organizationId, feeId, receiptId);
    if (studentId && receipt.studentId !== studentId) {
      throw new NotFoundException("Comprovante não encontrado.");
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    return {
      viewUrl: await this.r2.generateReadUrl(receipt.fileKey, 5 * 60),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async approveReceipt(
    organizationId: string,
    feeId: string,
    receiptId: string,
    userId: string,
  ): Promise<MonthlyFeeDetail> {
    await this.lifecycle.approveReceipt(organizationId, feeId, receiptId, userId);
    return this.get(organizationId, feeId);
  }

  async rejectReceipt(
    organizationId: string,
    feeId: string,
    receiptId: string,
    userId: string,
    input: RejectReceiptInput,
  ): Promise<MonthlyFeeDetail> {
    await this.lifecycle.rejectReceipt(organizationId, feeId, receiptId, userId, input);
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

  private async findStudentFee(organizationId: string, studentId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(monthlyFees)
      .where(
        and(
          eq(monthlyFees.id, id),
          eq(monthlyFees.organizationId, organizationId),
          eq(monthlyFees.studentId, studentId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException("Mensalidade não encontrada.");
    }

    return row;
  }

  private validateReceiptSubmissionStatus(status: string): void {
    if (status === "paid" || status === "waived") {
      throw new BadRequestException("Mensalidade paga ou dispensada não aceita comprovante.");
    }
    if (status !== "open" && status !== "under_review") {
      throw new BadRequestException("Status da mensalidade não aceita comprovante.");
    }
  }

  private validateReceiptFileType(contentType: string): void {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestException("Tipo de arquivo não permitido. Use imagem ou PDF.");
    }
  }

  private assertActivePendingReceipt(feeStatus: string, receipt: ReceiptRow): void {
    if (feeStatus !== "under_review" || receipt.status !== "pending") {
      throw new BadRequestException("Apenas o comprovante pendente ativo pode ser revisado.");
    }
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
    fileKey: row.fileKey,
    fileUrl: row.fileUrl,
    fileType: row.fileType,
    fileSizeBytes: row.fileSizeBytes,
    note: row.note,
    status: parseReceiptStatus(row.status),
    rejectionReason: row.rejectionReason,
    replacedAt: row.replacedAt?.toISOString() ?? null,
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
  const valid = [
    "waived",
    "adjusted",
    "receipt_approved",
    "receipt_rejected",
    "receipt_replaced",
    "manual_payment",
  ];
  if (valid.includes(value)) return value as MonthlyFeeDetail["events"][number]["type"];
  throw new BadRequestException("Tipo de evento inválido.");
}

function parseReceiptStatus(value: string) {
  const valid = ["pending", "approved", "rejected", "replaced"];
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
