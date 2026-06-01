import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
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
import { AcademiaScope } from "../academy-scope/academia-scope.service";
import { DATABASE } from "../database/database.module";
import { projectMonthlyFeeDetail } from "./monthly-fee-detail-projection";
import { MonthlyFeeLifecycle } from "./monthly-fee-lifecycle";
import { filterMonthlyFeeListRows, summarizeMonthlyFeeRows } from "./monthly-fee-list-projection";
import { projectMonthlyFeeStatus } from "./monthly-fee-status-projection";
import { R2StorageService } from "./r2-storage.service";
import {
  projectStudentMonthlyFeeHistory,
  studentMonthlyFeeHistoryCutoffDate,
} from "./student-monthly-fee-history-projection";

type FeeRow = typeof monthlyFees.$inferSelect;
type EventRow = typeof monthlyFeeEvents.$inferSelect;
type ReceiptRow = typeof paymentReceipts.$inferSelect;

@Injectable()
export class MonthlyFeesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(R2StorageService) private readonly r2: R2StorageService,
    @Inject(MonthlyFeeLifecycle) private readonly lifecycle: MonthlyFeeLifecycle,
    @Inject(AcademiaScope) private readonly academiaScope: AcademiaScope,
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
        organizationId: monthlyFees.organizationId,
        status: monthlyFees.status,
        dueDate: monthlyFees.dueDate,
      })
      .from(monthlyFees)
      .where(eq(monthlyFees.organizationId, organizationId));

    const today = new Date();
    const filteredRows = filterMonthlyFeeListRows(rows, {
      organizationId,
      status: filters.status,
      today,
    });

    return {
      fees: filteredRows.map((r) => toFeeDto(r.fee, r.studentName)),
      summary: summarizeMonthlyFeeRows(allRows, organizationId, today),
    };
  }

  async create(organizationId: string, input: CreateMonthlyFeeInput): Promise<MonthlyFeeDetail> {
    const { feeId } = await this.lifecycle.create(organizationId, input);
    return this.get(organizationId, feeId);
  }

  async get(organizationId: string, id: string): Promise<MonthlyFeeDetail> {
    await this.academiaScope.assertMonthlyFeeBelongsToAcademia(organizationId, id);

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

    const detailProjection = projectMonthlyFeeDetail({
      organizationId,
      fee: row.fee,
      events,
      receipts,
    });
    if (!detailProjection) {
      throw new NotFoundException("Mensalidade não encontrada.");
    }

    return {
      ...toFeeDto(detailProjection.fee, row.studentName),
      paymentOrigin: detailProjection.paymentOrigin,
      events: detailProjection.events.map(toEventDto),
      receipts: detailProjection.receipts.history.map(toReceiptDto),
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
    await this.academiaScope.assertStudentBelongsToAcademia(organizationId, studentId);

    const now = new Date();
    const cutoffDate = studentMonthlyFeeHistoryCutoffDate(now);

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

    const historyProjection = projectStudentMonthlyFeeHistory({
      rows,
      receiptsByFee,
      organizationId,
      studentId,
      today: now,
    });

    return {
      fees: historyProjection.map(({ fee: row, status, receipts }) => {
        const lastRelevant = receipts.studentRelevantReceipt;

        return {
          id: row.id,
          referenceYear: row.referenceYear,
          referenceMonth: row.referenceMonth,
          amountInCents: row.amountInCents,
          dueDate: row.dueDate,
          status: status.persistedStatus,
          isOverdue: status.isOverdue,
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
    await this.lifecycle.assertCanSubmitReceipt(organizationId, feeId, studentId);
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
    await this.academiaScope.assertMonthlyFeeBelongsToAcademia(organizationId, feeId);
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
    if (studentId) {
      await this.academiaScope.assertStudentMonthlyFeeBelongsToAcademia(
        organizationId,
        studentId,
        feeId,
      );
    } else {
      await this.academiaScope.assertMonthlyFeeBelongsToAcademia(organizationId, feeId);
    }

    const receipt = await this.academiaScope.assertPixReceiptBelongsToAcademia(
      organizationId,
      receiptId,
      feeId,
    );
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

  private validateReceiptFileType(contentType: string): void {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestException("Tipo de arquivo não permitido. Use imagem ou PDF.");
    }
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
    isOverdue: projectMonthlyFeeStatus(row).isOverdue,
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
