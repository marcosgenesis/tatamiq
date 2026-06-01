import { describe, expect, it } from "vitest";
import {
  projectStudentMonthlyFeeHistory,
  type StudentMonthlyFeeHistoryRow,
  studentMonthlyFeeHistoryCutoffDate,
} from "./student-monthly-fee-history-projection";

const today = new Date("2026-06-15T15:00:00.000Z");

function fee(
  id: string,
  overrides: Partial<StudentMonthlyFeeHistoryRow> = {},
): StudentMonthlyFeeHistoryRow {
  return {
    id,
    organizationId: "academy-1",
    studentId: "student-1",
    status: "open",
    dueDate: "2026-06-10",
    ...overrides,
  };
}

function receipt(id: string, status: string, createdAt = "2026-06-10T10:00:00.000Z") {
  return {
    id,
    status,
    createdAt: new Date(createdAt),
    rejectionReason: status === "rejected" ? "Valor não confere" : null,
    note: null,
  };
}

describe("studentMonthlyFeeHistoryCutoffDate", () => {
  it("uses the first day of the oldest month in the last 12-month window", () => {
    expect(studentMonthlyFeeHistoryCutoffDate(today)).toBe("2025-07-01");
  });
});

describe("projectStudentMonthlyFeeHistory", () => {
  it("limits student history to the last 12 months", () => {
    const projection = projectStudentMonthlyFeeHistory({
      rows: [
        fee("old", { dueDate: "2025-06-30" }),
        fee("cutoff", { dueDate: "2025-07-01" }),
        fee("current", { dueDate: "2026-06-10" }),
      ],
      receiptsByFee: new Map(),
      organizationId: "academy-1",
      studentId: "student-1",
      today,
    });

    expect(projection.map((item) => item.fee.id)).toEqual(["cutoff", "current"]);
  });

  it("includes only mensalidades for the authenticated Aluno in the active Academia", () => {
    const projection = projectStudentMonthlyFeeHistory({
      rows: [
        fee("mine"),
        fee("other-student", { studentId: "student-2" }),
        fee("other-academy", { organizationId: "academy-2" }),
      ],
      receiptsByFee: new Map(),
      organizationId: "academy-1",
      studentId: "student-1",
      today,
    });

    expect(projection.map((item) => item.fee.id)).toEqual(["mine"]);
  });

  it("uses projected status and does not show under-review mensalidades as overdue", () => {
    const projection = projectStudentMonthlyFeeHistory({
      rows: [
        fee("overdue", { status: "open", dueDate: "2026-06-14" }),
        fee("review", { status: "under_review", dueDate: "2026-06-01" }),
      ],
      receiptsByFee: new Map(),
      organizationId: "academy-1",
      studentId: "student-1",
      today,
    });

    expect(
      projection.map((item) => [item.fee.id, item.status.projectedStatus, item.status.isOverdue]),
    ).toEqual([
      ["overdue", "overdue", true],
      ["review", "under_review", false],
    ]);
  });

  it("uses Comprovante Pix projection and keeps rejected reasons visible", () => {
    const receiptsByFee = new Map([
      ["pending-fee", [receipt("pending", "pending")]],
      ["rejected-fee", [receipt("rejected", "rejected")]],
      ["replaced-fee", [receipt("replaced", "replaced")]],
    ]);

    const projection = projectStudentMonthlyFeeHistory({
      rows: [fee("pending-fee"), fee("rejected-fee"), fee("replaced-fee")],
      receiptsByFee,
      organizationId: "academy-1",
      studentId: "student-1",
      today,
    });

    expect(projection[0]?.receipts.studentRelevantReceipt?.id).toBe("pending");
    expect(projection[1]?.receipts.studentRelevantReceipt?.rejectionReason).toBe(
      "Valor não confere",
    );
    expect(projection[2]?.receipts.studentRelevantReceipt).toBeNull();
  });
});
