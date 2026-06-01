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
  ManualPaymentInput,
  RejectReceiptInput,
  WaiveMonthlyFeeInput,
} from "@tatamiq/contracts";
import {
  type Database,
  monthlyFeeEvents,
  monthlyFees,
  paymentReceipts,
  students,
} from "@tatamiq/database";
import { and, desc, eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { clampDueDay, formatDueDate, validateCanCreateFee } from "./monthly-fee-rules";

type FeeRow = typeof monthlyFees.$inferSelect;
type ReceiptRow = typeof paymentReceipts.$inferSelect;
type StudentRow = typeof students.$inferSelect;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

@Injectable()
export class MonthlyFeeLifecycle {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(organizationId: string, input: CreateMonthlyFeeInput): Promise<{ feeId: string }> {
    const feeId = crypto.randomUUID();

    try {
      await this.db.transaction(async (tx) => {
        const student = await this.findStudent(tx, organizationId, input.studentId);
        validateCanCreateFee(student);

        const dueDate = clampDueDay(input.dueDay, input.referenceYear, input.referenceMonth);
        const now = new Date();

        await tx.insert(monthlyFees).values({
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
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("Já existe uma mensalidade para este aluno neste mês.");
      }
      throw error;
    }

    return { feeId };
  }

  async assertCanSubmitReceipt(
    organizationId: string,
    feeId: string,
    studentId?: string,
  ): Promise<void> {
    const fee = studentId
      ? await this.findStudentFee(this.db, organizationId, studentId, feeId)
      : await this.findFee(this.db, organizationId, feeId);
    assertCanSubmitReceipt(fee.status);
  }

  async adjust(
    organizationId: string,
    feeId: string,
    actorUserId: string,
    input: AdjustMonthlyFeeInput,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const fee = await this.findFee(tx, organizationId, feeId);
      assertOpenFor(fee.status, "adjust");
      const now = new Date();

      await tx
        .update(monthlyFees)
        .set({
          amountInCents: input.amountInCents,
          originalAmountInCents: fee.originalAmountInCents ?? fee.amountInCents,
          updatedAt: now,
        })
        .where(and(eq(monthlyFees.id, feeId), eq(monthlyFees.organizationId, organizationId)));

      await this.writeEvent(tx, {
        organizationId,
        monthlyFeeId: feeId,
        type: "adjusted",
        reason: input.reason,
        metadata: {
          previousAmountInCents: fee.amountInCents,
          newAmountInCents: input.amountInCents,
        },
        actorUserId,
        now,
      });
    });
  }

  async waive(
    organizationId: string,
    feeId: string,
    actorUserId: string,
    input: WaiveMonthlyFeeInput,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const fee = await this.findFee(tx, organizationId, feeId);
      assertOpenFor(fee.status, "waive");
      const now = new Date();

      await tx
        .update(monthlyFees)
        .set({ status: "waived", paidAt: null, updatedAt: now })
        .where(and(eq(monthlyFees.id, feeId), eq(monthlyFees.organizationId, organizationId)));

      await this.writeEvent(tx, {
        organizationId,
        monthlyFeeId: feeId,
        type: "waived",
        reason: input.reason,
        metadata: null,
        actorUserId,
        now,
      });
    });
  }

  async recordManualPayment(
    organizationId: string,
    feeId: string,
    actorUserId: string,
    input: ManualPaymentInput,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const fee = await this.findFee(tx, organizationId, feeId);
      assertOpenFor(fee.status, "manual_payment");
      const now = new Date();
      const note = input.note?.trim() || null;

      await tx
        .update(monthlyFees)
        .set({ status: "paid", paidAt: now, updatedAt: now })
        .where(and(eq(monthlyFees.id, feeId), eq(monthlyFees.organizationId, organizationId)));

      await this.writeEvent(tx, {
        organizationId,
        monthlyFeeId: feeId,
        type: "manual_payment",
        reason: note,
        metadata: null,
        actorUserId,
        now,
      });
    });
  }

  async submitReceipt(
    organizationId: string,
    feeId: string,
    actorUserId: string,
    input: ConfirmReceiptInput,
    studentId?: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const fee = studentId
        ? await this.findStudentFee(tx, organizationId, studentId, feeId)
        : await this.findFee(tx, organizationId, feeId);
      assertCanSubmitReceipt(fee.status);

      const [pendingReceipt] = await tx
        .select()
        .from(paymentReceipts)
        .where(and(eq(paymentReceipts.monthlyFeeId, feeId), eq(paymentReceipts.status, "pending")))
        .orderBy(desc(paymentReceipts.createdAt))
        .limit(1);

      const now = new Date();
      const newReceiptId = crypto.randomUUID();

      if (pendingReceipt) {
        await tx
          .update(paymentReceipts)
          .set({ status: "replaced", replacedAt: now })
          .where(eq(paymentReceipts.id, pendingReceipt.id));
      }

      await tx.insert(paymentReceipts).values({
        id: newReceiptId,
        monthlyFeeId: feeId,
        organizationId,
        studentId: fee.studentId,
        fileKey: input.fileKey,
        fileUrl: null,
        fileType: input.fileType,
        fileSizeBytes: input.fileSizeBytes,
        note: input.note?.trim() || null,
        status: "pending",
        rejectionReason: null,
        replacedAt: null,
        createdByUserId: actorUserId,
        createdAt: now,
      });

      await tx
        .update(monthlyFees)
        .set({ status: "under_review", updatedAt: now })
        .where(eq(monthlyFees.id, feeId));

      if (pendingReceipt) {
        await this.writeEvent(tx, {
          organizationId,
          monthlyFeeId: feeId,
          type: "receipt_replaced",
          reason: null,
          metadata: { previousReceiptId: pendingReceipt.id, newReceiptId },
          actorUserId,
          now,
        });
      }
    });
  }

  async approveReceipt(
    organizationId: string,
    feeId: string,
    receiptId: string,
    actorUserId: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const fee = await this.findFee(tx, organizationId, feeId);
      const receipt = await this.findReceipt(tx, organizationId, feeId, receiptId);
      assertActivePendingReceipt(fee.status, receipt);
      const now = new Date();

      await tx
        .update(paymentReceipts)
        .set({ status: "approved" })
        .where(eq(paymentReceipts.id, receiptId));
      await tx
        .update(monthlyFees)
        .set({ status: "paid", paidAt: now, updatedAt: now })
        .where(eq(monthlyFees.id, feeId));

      await this.writeEvent(tx, {
        organizationId,
        monthlyFeeId: feeId,
        type: "receipt_approved",
        reason: null,
        metadata: { receiptId },
        actorUserId,
        now,
      });
    });
  }

  async rejectReceipt(
    organizationId: string,
    feeId: string,
    receiptId: string,
    actorUserId: string,
    input: RejectReceiptInput,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const fee = await this.findFee(tx, organizationId, feeId);
      const receipt = await this.findReceipt(tx, organizationId, feeId, receiptId);
      assertActivePendingReceipt(fee.status, receipt);
      const now = new Date();

      await tx
        .update(paymentReceipts)
        .set({ status: "rejected", rejectionReason: input.reason })
        .where(eq(paymentReceipts.id, receiptId));

      await tx
        .update(monthlyFees)
        .set({ status: "open", paidAt: null, updatedAt: now })
        .where(eq(monthlyFees.id, feeId));

      await this.writeEvent(tx, {
        organizationId,
        monthlyFeeId: feeId,
        type: "receipt_rejected",
        reason: input.reason,
        metadata: { receiptId },
        actorUserId,
        now,
      });
    });
  }

  private async findStudent(
    tx: Transaction,
    organizationId: string,
    studentId: string,
  ): Promise<StudentRow> {
    const [student] = await tx
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.organizationId, organizationId)))
      .limit(1);
    if (!student) throw new NotFoundException("Aluno não encontrado.");
    return student;
  }

  private async findFee(
    tx: Transaction | Database,
    organizationId: string,
    id: string,
  ): Promise<FeeRow> {
    const [row] = await tx
      .select()
      .from(monthlyFees)
      .where(and(eq(monthlyFees.id, id), eq(monthlyFees.organizationId, organizationId)))
      .limit(1);
    if (!row) throw new NotFoundException("Mensalidade não encontrada.");
    return row;
  }

  private async findStudentFee(
    tx: Transaction | Database,
    organizationId: string,
    studentId: string,
    id: string,
  ): Promise<FeeRow> {
    const [row] = await tx
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
    if (!row) throw new NotFoundException("Mensalidade não encontrada.");
    return row;
  }

  private async findReceipt(
    tx: Transaction,
    organizationId: string,
    feeId: string,
    receiptId: string,
  ): Promise<ReceiptRow> {
    const [row] = await tx
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
    if (!row) throw new NotFoundException("Comprovante não encontrado.");
    return row;
  }

  private async writeEvent(
    tx: Transaction,
    input: {
      organizationId: string;
      monthlyFeeId: string;
      type: string;
      reason: string | null;
      metadata: Record<string, unknown> | null;
      actorUserId: string;
      now: Date;
    },
  ): Promise<void> {
    await tx.insert(monthlyFeeEvents).values({
      id: crypto.randomUUID(),
      monthlyFeeId: input.monthlyFeeId,
      organizationId: input.organizationId,
      type: input.type,
      reason: input.reason,
      metadata: input.metadata,
      createdByUserId: input.actorUserId,
      createdAt: input.now,
    });
  }
}

type OpenOnlyAction = "adjust" | "waive" | "manual_payment";

function assertOpenFor(currentStatus: string, action: OpenOnlyAction): void {
  if (currentStatus === "open") return;
  const labels: Record<OpenOnlyAction, string> = {
    adjust: "ajustada",
    waive: "dispensada",
    manual_payment: "marcada como paga",
  };
  throw new BadRequestException(`Mensalidade só pode ser ${labels[action]} quando está em aberto.`);
}

function assertCanSubmitReceipt(status: string): void {
  if (status === "paid" || status === "waived") {
    throw new BadRequestException("Mensalidade paga ou dispensada não aceita comprovante.");
  }
  if (status !== "open" && status !== "under_review") {
    throw new BadRequestException("Status da mensalidade não aceita comprovante.");
  }
}

function assertActivePendingReceipt(feeStatus: string, receipt: ReceiptRow): void {
  if (feeStatus !== "under_review" || receipt.status !== "pending") {
    throw new BadRequestException("Apenas o comprovante pendente ativo pode ser revisado.");
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}
