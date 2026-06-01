import { describe, expect, it } from "vitest";
import { projectMonthlyFeeDetail } from "./monthly-fee-detail-projection";

const today = new Date("2026-01-10T15:00:00.000Z");

function fee(overrides = {}) {
  return {
    id: "fee-1",
    organizationId: "academy-1",
    status: "open",
    dueDate: "2026-01-09",
    ...overrides,
  };
}

function event(id: string, createdAt: string) {
  return {
    id,
    createdAt: new Date(createdAt),
  };
}

function receipt(id: string, status: string, createdAt: string) {
  return {
    id,
    status,
    createdAt: new Date(createdAt),
    rejectionReason: status === "rejected" ? "Imagem ilegível" : null,
    note: null,
  };
}

describe("projectMonthlyFeeDetail", () => {
  it("projects detail status, event history, receipt history, and active pending receipt", () => {
    const events = [
      event("adjusted", "2026-01-01T10:00:00.000Z"),
      event("receipt-replaced", "2026-01-02T10:00:00.000Z"),
    ];
    const receipts = [
      receipt("replaced", "replaced", "2026-01-01T10:00:00.000Z"),
      receipt("pending", "pending", "2026-01-02T10:00:00.000Z"),
    ];

    const projection = projectMonthlyFeeDetail({
      organizationId: "academy-1",
      fee: fee(),
      events,
      receipts,
      today,
    });

    expect(projection?.status.projectedStatus).toBe("overdue");
    expect(projection?.events.map((item) => item.id)).toEqual(["adjusted", "receipt-replaced"]);
    expect(projection?.receipts.history.map((item) => item.id)).toEqual(["replaced", "pending"]);
    expect(projection?.receipts.activePendingReceipt?.id).toBe("pending");
  });

  it("keeps approved and rejected Comprovante Pix history in the expected order", () => {
    const receipts = [
      receipt("rejected", "rejected", "2026-01-01T10:00:00.000Z"),
      receipt("approved", "approved", "2026-01-02T10:00:00.000Z"),
    ];

    const projection = projectMonthlyFeeDetail({
      organizationId: "academy-1",
      fee: fee({ status: "paid" }),
      events: [],
      receipts,
      today,
    });

    expect(projection?.status.projectedStatus).toBe("paid");
    expect(projection?.receipts.history.map((item) => item.id)).toEqual(["rejected", "approved"]);
    expect(projection?.receipts.history[0]?.rejectionReason).toBe("Imagem ilegível");
    expect(projection?.receipts.activePendingReceipt).toBeNull();
  });

  it("returns null when the Mensalidade does not belong to the active Academia", () => {
    expect(
      projectMonthlyFeeDetail({
        organizationId: "academy-1",
        fee: fee({ organizationId: "academy-2" }),
        events: [event("adjusted", "2026-01-01T10:00:00.000Z")],
        receipts: [receipt("pending", "pending", "2026-01-02T10:00:00.000Z")],
        today,
      }),
    ).toBeNull();
  });
});
