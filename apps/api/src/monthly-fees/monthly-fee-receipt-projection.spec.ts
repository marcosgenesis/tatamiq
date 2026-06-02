import { describe, expect, it } from "vitest";
import {
  type MonthlyFeeReceiptProjectionRow,
  projectMonthlyFeeReceipts,
} from "./monthly-fee-receipt-projection";

function receipt(
  id: string,
  status: string,
  createdAt: string,
  overrides: Partial<MonthlyFeeReceiptProjectionRow> = {},
): MonthlyFeeReceiptProjectionRow {
  return {
    id,
    status,
    createdAt: new Date(createdAt),
    rejectionReason: null,
    note: null,
    ...overrides,
  };
}

describe("projectMonthlyFeeReceipts", () => {
  it("projects a pending Comprovante Pix as the active receipt", () => {
    const pending = receipt("pending-1", "pending", "2026-01-10T10:00:00.000Z");

    const projection = projectMonthlyFeeReceipts([pending]);

    expect(projection.activePendingReceipt?.id).toBe("pending-1");
    expect(projection.studentRelevantReceipt?.id).toBe("pending-1");
    expect(projection.history.map((item) => item.id)).toEqual(["pending-1"]);
  });

  it("keeps replaced Comprovantes Pix in history but never projects them as active", () => {
    const replaced = receipt("replaced-1", "replaced", "2026-01-10T10:00:00.000Z");

    const projection = projectMonthlyFeeReceipts([replaced]);

    expect(projection.activePendingReceipt).toBeNull();
    expect(projection.studentRelevantReceipt).toBeNull();
    expect(projection.history.map((item) => item.id)).toEqual(["replaced-1"]);
  });

  it("keeps rejected Comprovantes Pix in history with rejection reason", () => {
    const rejected = receipt("rejected-1", "rejected", "2026-01-10T10:00:00.000Z", {
      rejectionReason: "Valor divergente",
    });

    const projection = projectMonthlyFeeReceipts([rejected]);

    expect(projection.activePendingReceipt).toBeNull();
    expect(projection.studentRelevantReceipt?.id).toBe("rejected-1");
    expect(projection.history[0]?.rejectionReason).toBe("Valor divergente");
  });

  it("keeps approved Comprovantes Pix in history after payment approval", () => {
    const approved = receipt("approved-1", "approved", "2026-01-10T10:00:00.000Z");

    const projection = projectMonthlyFeeReceipts([approved]);

    expect(projection.activePendingReceipt).toBeNull();
    expect(projection.studentRelevantReceipt?.id).toBe("approved-1");
    expect(projection.history.map((item) => item.id)).toEqual(["approved-1"]);
  });

  it("preserves existing history order while choosing active pending from mixed receipt histories", () => {
    const receipts = [
      receipt("replaced-old", "replaced", "2026-01-01T10:00:00.000Z"),
      receipt("rejected", "rejected", "2026-01-02T10:00:00.000Z", {
        rejectionReason: "Imagem ilegível",
      }),
      receipt("approved", "approved", "2026-01-03T10:00:00.000Z"),
      receipt("pending", "pending", "2026-01-04T10:00:00.000Z"),
    ];

    const projection = projectMonthlyFeeReceipts(receipts);

    expect(projection.history.map((item) => item.id)).toEqual([
      "replaced-old",
      "rejected",
      "approved",
      "pending",
    ]);
    expect(projection.activePendingReceipt?.id).toBe("pending");
    expect(projection.studentRelevantReceipt?.id).toBe("pending");
  });

  it("keeps the existing student fallback priority of approved before rejected when there is no pending receipt", () => {
    const receipts = [
      receipt("approved", "approved", "2026-01-03T10:00:00.000Z"),
      receipt("rejected-newer", "rejected", "2026-01-04T10:00:00.000Z", {
        rejectionReason: "Arquivo incorreto",
      }),
    ];

    const projection = projectMonthlyFeeReceipts(receipts);

    expect(projection.activePendingReceipt).toBeNull();
    expect(projection.studentRelevantReceipt?.id).toBe("approved");
  });
});
