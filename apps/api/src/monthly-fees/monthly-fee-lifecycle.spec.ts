import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcademiaScope } from "../academy-scope/academia-scope.service";
import { MonthlyFeeLifecycle } from "./monthly-fee-lifecycle";

type MockRow = Record<string, unknown>;

function createMockDb(selectResults: MockRow[][] = []) {
  const inserted: MockRow[] = [];
  const updates: MockRow[] = [];
  let selectCallIndex = 0;

  const tx = {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            const result = selectResults[selectCallIndex] ?? [];
            selectCallIndex++;
            return Promise.resolve(result);
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              const result = selectResults[selectCallIndex] ?? [];
              selectCallIndex++;
              return Promise.resolve(result);
            }),
          }),
        }),
      }),
    })),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation((values: MockRow) => ({
        where: vi.fn().mockImplementation(() => {
          updates.push(values);
          return Promise.resolve();
        }),
      })),
    })),
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((values: MockRow) => {
        inserted.push(values);
        return Promise.resolve();
      }),
    })),
  };

  const db = {
    transaction: vi
      .fn()
      .mockImplementation((command: (txArg: typeof tx) => Promise<unknown>) => command(tx)),
  };

  return { db, tx, inserted, updates };
}

function fee(overrides: MockRow = {}): MockRow {
  return {
    id: "fee-1",
    organizationId: "org-1",
    studentId: "student-1",
    amountInCents: 10000,
    originalAmountInCents: null,
    status: "open",
    paidAt: null,
    ...overrides,
  };
}

function receipt(overrides: MockRow = {}): MockRow {
  return {
    id: "receipt-1",
    monthlyFeeId: "fee-1",
    organizationId: "org-1",
    studentId: "student-1",
    status: "pending",
    ...overrides,
  };
}

function student(overrides: MockRow = {}): MockRow {
  return {
    id: "student-1",
    organizationId: "org-1",
    status: "active",
    monthlyAmountInCents: 10000,
    monthlyDueDay: 10,
    ...overrides,
  };
}

describe("MonthlyFeeLifecycle", () => {
  let service: MonthlyFeeLifecycle;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an open Mensalidade with due date and initial lifecycle fields", async () => {
    const mock = createMockDb([[student()]]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    const result = await service.create("org-1", {
      studentId: "student-1",
      referenceYear: 2026,
      referenceMonth: 2,
      amountInCents: 15000,
      dueDay: 31,
    });

    expect(result.feeId).toBeTruthy();
    expect(mock.inserted[0]).toMatchObject({
      id: result.feeId,
      organizationId: "org-1",
      studentId: "student-1",
      referenceYear: 2026,
      referenceMonth: 2,
      amountInCents: 15000,
      originalAmountInCents: null,
      dueDate: "2026-02-28",
      status: "open",
      paidAt: null,
    });
  });

  it("rejects Mensalidade creation when the Aluno has no configured monthly amount", async () => {
    const mock = createMockDb([[student({ monthlyAmountInCents: null })]]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await expect(
      service.create("org-1", {
        studentId: "student-1",
        referenceYear: 2026,
        referenceMonth: 2,
        amountInCents: 15000,
        dueDay: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mock.inserted).toHaveLength(0);
  });

  it("adjusts an open Mensalidade, preserving the original amount and writing an Evento de Mensalidade", async () => {
    const mock = createMockDb([[fee()]]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await service.adjust("org-1", "fee-1", "user-1", {
      amountInCents: 12000,
      reason: "Correção",
    });

    expect(mock.updates[0]).toMatchObject({
      amountInCents: 12000,
      originalAmountInCents: 10000,
    });
    expect(mock.inserted[0]).toMatchObject({
      monthlyFeeId: "fee-1",
      organizationId: "org-1",
      type: "adjusted",
      reason: "Correção",
      metadata: { previousAmountInCents: 10000, newAmountInCents: 12000 },
      createdByUserId: "user-1",
    });
  });

  it("does not overwrite originalAmountInCents on a second Ajuste de Mensalidade", async () => {
    const mock = createMockDb([[fee({ amountInCents: 12000, originalAmountInCents: 10000 })]]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await service.adjust("org-1", "fee-1", "user-1", {
      amountInCents: 9000,
      reason: "Desconto",
    });

    expect(mock.updates[0]).toMatchObject({
      amountInCents: 9000,
      originalAmountInCents: 10000,
    });
  });

  it("waives an open Mensalidade without marking it as paid", async () => {
    const mock = createMockDb([[fee()]]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await service.waive("org-1", "fee-1", "user-1", { reason: "Cortesia" });

    expect(mock.updates[0]).toMatchObject({ status: "waived", paidAt: null });
    expect(mock.inserted[0]).toMatchObject({
      type: "waived",
      reason: "Cortesia",
      metadata: null,
    });
  });

  it("records Pagamento Manual as paid with an Evento de Mensalidade", async () => {
    const mock = createMockDb([[fee()]]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await service.recordManualPayment("org-1", "fee-1", "user-1", { note: "Pago em dinheiro" });

    expect(mock.updates[0]).toMatchObject({ status: "paid" });
    expect(mock.updates[0].paidAt).toBeInstanceOf(Date);
    expect(mock.inserted[0]).toMatchObject({
      type: "manual_payment",
      reason: "Pago em dinheiro",
      metadata: null,
    });
  });

  it("submits Comprovante Pix and moves Mensalidade to Verificação de Pagamento", async () => {
    const mock = createMockDb([[fee()], []]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await service.submitReceipt("org-1", "fee-1", "user-1", {
      fileKey: "receipts/org-1/fee-1/file",
      fileType: "image/png",
      fileSizeBytes: 1234,
      note: "Segue comprovante",
    });

    expect(mock.inserted[0]).toMatchObject({
      monthlyFeeId: "fee-1",
      organizationId: "org-1",
      studentId: "student-1",
      fileKey: "receipts/org-1/fee-1/file",
      status: "pending",
      note: "Segue comprovante",
      createdByUserId: "user-1",
    });
    expect(mock.updates[0]).toMatchObject({ status: "under_review" });
  });

  it("replaces the previous pending Comprovante Pix and writes replacement event", async () => {
    const mock = createMockDb([
      [fee({ status: "under_review" })],
      [receipt({ id: "old-receipt" })],
    ]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await service.submitReceipt("org-1", "fee-1", "user-1", {
      fileKey: "receipts/org-1/fee-1/new-file",
      fileType: "application/pdf",
      fileSizeBytes: 2000,
      note: undefined,
    });

    expect(mock.updates[0]).toMatchObject({ status: "replaced" });
    expect(mock.inserted[0]).toMatchObject({
      monthlyFeeId: "fee-1",
      fileKey: "receipts/org-1/fee-1/new-file",
      status: "pending",
    });
    expect(mock.inserted[1]).toMatchObject({
      type: "receipt_replaced",
      metadata: { previousReceiptId: "old-receipt" },
    });
    expect((mock.inserted[1].metadata as Record<string, unknown>).newReceiptId).toBeTruthy();
  });

  it("replaces only the student's own pending Comprovante Pix", async () => {
    const mock = createMockDb([
      [fee({ status: "under_review" })],
      [receipt({ id: "old-receipt" })],
    ]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await service.submitReceipt(
      "org-1",
      "fee-1",
      "user-1",
      {
        fileKey: "receipts/org-1/fee-1/new-file",
        fileType: "application/pdf",
        fileSizeBytes: 2000,
        note: undefined,
      },
      "student-1",
    );

    expect(mock.updates[0]).toMatchObject({ status: "replaced" });
    expect(mock.inserted[0]).toMatchObject({
      monthlyFeeId: "fee-1",
      studentId: "student-1",
      fileKey: "receipts/org-1/fee-1/new-file",
      status: "pending",
    });
  });

  it("blocks student Comprovante Pix submission for another student or Academia", async () => {
    const mock = createMockDb([[]]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await expect(
      service.submitReceipt(
        "org-1",
        "fee-other",
        "user-1",
        {
          fileKey: "receipts/org-1/fee-other/file",
          fileType: "application/pdf",
          fileSizeBytes: 2000,
          note: undefined,
        },
        "student-1",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(mock.updates).toHaveLength(0);
    expect(mock.inserted).toHaveLength(0);
  });

  it("approves a pending Comprovante Pix and marks the Mensalidade as paid", async () => {
    const mock = createMockDb([[fee({ status: "under_review" })], [receipt()]]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await service.approveReceipt("org-1", "fee-1", "receipt-1", "user-1");

    expect(mock.updates[0]).toMatchObject({ status: "approved" });
    expect(mock.updates[1]).toMatchObject({ status: "paid" });
    expect(mock.updates[1].paidAt).toBeInstanceOf(Date);
    expect(mock.inserted[0]).toMatchObject({
      type: "receipt_approved",
      metadata: { receiptId: "receipt-1" },
    });
  });

  it("rejects a pending Comprovante Pix and returns the Mensalidade to open", async () => {
    const mock = createMockDb([[fee({ status: "under_review" })], [receipt()]]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await service.rejectReceipt("org-1", "fee-1", "receipt-1", "user-1", {
      reason: "Valor divergente",
    });

    expect(mock.updates[0]).toMatchObject({
      status: "rejected",
      rejectionReason: "Valor divergente",
    });
    expect(mock.updates[1]).toMatchObject({ status: "open", paidAt: null });
    expect(mock.inserted[0]).toMatchObject({
      type: "receipt_rejected",
      reason: "Valor divergente",
      metadata: { receiptId: "receipt-1" },
    });
  });

  it("rejects open-only actions for a Mensalidade outside open status before writing", async () => {
    const mock = createMockDb([[fee({ status: "paid" })]]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await expect(
      service.waive("org-1", "fee-1", "user-1", { reason: "Tentativa inválida" }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mock.updates).toHaveLength(0);
    expect(mock.inserted).toHaveLength(0);
  });

  it("rejects receipt review unless the Mensalidade is under review and the receipt is pending", async () => {
    const mock = createMockDb([[fee({ status: "open" })], [receipt()]]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await expect(
      service.approveReceipt("org-1", "fee-1", "receipt-1", "user-1"),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mock.updates).toHaveLength(0);
    expect(mock.inserted).toHaveLength(0);
  });

  it.each([
    [
      "create",
      async (s: MonthlyFeeLifecycle) =>
        s.create("org-1", {
          studentId: "student-other",
          referenceYear: 2026,
          referenceMonth: 2,
          amountInCents: 15000,
          dueDay: 10,
        }),
    ],
    [
      "adjust",
      async (s: MonthlyFeeLifecycle) =>
        s.adjust("org-1", "fee-other", "user-1", {
          amountInCents: 12000,
          reason: "Correção",
        }),
    ],
    [
      "waive",
      async (s: MonthlyFeeLifecycle) =>
        s.waive("org-1", "fee-other", "user-1", { reason: "Cortesia" }),
    ],
    [
      "manual payment",
      async (s: MonthlyFeeLifecycle) =>
        s.recordManualPayment("org-1", "fee-other", "user-1", { note: "Pago" }),
    ],
  ])("blocks cross-academy instructor write before mutation: %s", async (_label, action) => {
    const mock = createMockDb([[]]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await expect(action(service)).rejects.toBeInstanceOf(NotFoundException);

    expect(mock.updates).toHaveLength(0);
    expect(mock.inserted).toHaveLength(0);
  });

  it.each([
    [
      "approve",
      async (s: MonthlyFeeLifecycle) =>
        s.approveReceipt("org-1", "fee-1", "receipt-other", "user-1"),
    ],
    [
      "reject",
      async (s: MonthlyFeeLifecycle) =>
        s.rejectReceipt("org-1", "fee-1", "receipt-other", "user-1", { reason: "Incorreto" }),
    ],
  ])("blocks cross-academy Comprovante Pix write before mutation: %s", async (_label, action) => {
    const mock = createMockDb([[fee({ status: "under_review" })], []]);
    service = new MonthlyFeeLifecycle(mock.db as never, new AcademiaScope(mock.db as never));

    await expect(action(service)).rejects.toBeInstanceOf(NotFoundException);

    expect(mock.updates).toHaveLength(0);
    expect(mock.inserted).toHaveLength(0);
  });
});
