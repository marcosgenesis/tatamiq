import { describe, expect, it } from "vitest";
import {
  filterMonthlyFeeListRows,
  type MonthlyFeeListProjectionFee,
  monthlyFeeMatchesStatusFilter,
  summarizeMonthlyFeeRows,
} from "./monthly-fee-list-projection";

const today = new Date("2026-01-10T15:00:00.000Z");

function fee(overrides: Partial<MonthlyFeeListProjectionFee> = {}): MonthlyFeeListProjectionFee {
  return {
    organizationId: "academy-1",
    status: "open",
    dueDate: "2026-01-10",
    ...overrides,
  };
}

function row(id: string, overrides: Partial<MonthlyFeeListProjectionFee> = {}) {
  return {
    fee: {
      ...fee(overrides),
      id,
    },
    studentName: `Aluno ${id}`,
  };
}

describe("monthlyFeeMatchesStatusFilter", () => {
  it("keeps all mensalidades when no status or all is requested", () => {
    expect(monthlyFeeMatchesStatusFilter(fee({ status: "paid" }), undefined, today)).toBe(true);
    expect(monthlyFeeMatchesStatusFilter(fee({ status: "waived" }), "all", today)).toBe(true);
  });

  it("filters by persisted statuses for open, under_review, paid, and waived", () => {
    expect(monthlyFeeMatchesStatusFilter(fee({ status: "open" }), "open", today)).toBe(true);
    expect(
      monthlyFeeMatchesStatusFilter(fee({ status: "under_review" }), "under_review", today),
    ).toBe(true);
    expect(monthlyFeeMatchesStatusFilter(fee({ status: "paid" }), "paid", today)).toBe(true);
    expect(monthlyFeeMatchesStatusFilter(fee({ status: "waived" }), "waived", today)).toBe(true);
    expect(monthlyFeeMatchesStatusFilter(fee({ status: "paid" }), "open", today)).toBe(false);
  });

  it("filters overdue through calculated projected status", () => {
    expect(
      monthlyFeeMatchesStatusFilter(
        fee({ status: "open", dueDate: "2026-01-09" }),
        "overdue",
        today,
      ),
    ).toBe(true);
    expect(
      monthlyFeeMatchesStatusFilter(
        fee({ status: "under_review", dueDate: "2026-01-09" }),
        "overdue",
        today,
      ),
    ).toBe(false);
    expect(
      monthlyFeeMatchesStatusFilter(
        fee({ status: "open", dueDate: "2026-01-10" }),
        "overdue",
        today,
      ),
    ).toBe(false);
  });
});

describe("filterMonthlyFeeListRows", () => {
  it("preserves Academia isolation before applying status filters", () => {
    const rows = [
      row("current-open", { organizationId: "academy-1", status: "open" }),
      row("other-open", { organizationId: "academy-2", status: "open" }),
      row("current-paid", { organizationId: "academy-1", status: "paid" }),
    ];

    expect(
      filterMonthlyFeeListRows(rows, { organizationId: "academy-1", status: "open", today }).map(
        (item) => item.fee.id,
      ),
    ).toEqual(["current-open"]);
  });

  it("uses the same calculated overdue rule as the summary projection", () => {
    const rows = [
      row("overdue", { status: "open", dueDate: "2026-01-09" }),
      row("open", { status: "open", dueDate: "2026-01-10" }),
      row("review", { status: "under_review", dueDate: "2026-01-01" }),
    ];

    expect(
      filterMonthlyFeeListRows(rows, { organizationId: "academy-1", status: "overdue", today }).map(
        (item) => item.fee.id,
      ),
    ).toEqual(["overdue"]);
  });
});

describe("summarizeMonthlyFeeRows", () => {
  it("counts open, overdue, under-review, paid, waived, and total using projected status", () => {
    const rows = [
      fee({ status: "open", dueDate: "2026-01-10" }),
      fee({ status: "open", dueDate: "2026-01-09" }),
      fee({ status: "under_review", dueDate: "2026-01-01" }),
      fee({ status: "paid", dueDate: "2026-01-01" }),
      fee({ status: "waived", dueDate: "2026-01-01" }),
      fee({ organizationId: "academy-2", status: "open", dueDate: "2026-01-09" }),
    ];

    expect(summarizeMonthlyFeeRows(rows, "academy-1", today)).toEqual({
      open: 1,
      overdue: 1,
      underReview: 1,
      paid: 1,
      waived: 1,
      total: 5,
    });
  });
});
