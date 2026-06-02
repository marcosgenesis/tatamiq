import { describe, expect, it } from "vitest";
import {
  isMonthlyFeeOverdue,
  projectMonthlyFeeStatus,
  todayInSaoPaulo,
} from "./monthly-fee-status-projection";

describe("projectMonthlyFeeStatus", () => {
  const today = new Date("2026-01-10T15:00:00.000Z");

  it("projects persisted open with future due date as open", () => {
    expect(projectMonthlyFeeStatus({ status: "open", dueDate: "2026-01-11" }, today)).toMatchObject(
      {
        persistedStatus: "open",
        projectedStatus: "open",
        isOverdue: false,
      },
    );
  });

  it("projects persisted open on current due date as open", () => {
    expect(projectMonthlyFeeStatus({ status: "open", dueDate: "2026-01-10" }, today)).toMatchObject(
      {
        persistedStatus: "open",
        projectedStatus: "open",
        isOverdue: false,
      },
    );
  });

  it("projects persisted open with past due date as overdue", () => {
    expect(projectMonthlyFeeStatus({ status: "open", dueDate: "2026-01-09" }, today)).toMatchObject(
      {
        persistedStatus: "open",
        projectedStatus: "overdue",
        isOverdue: true,
      },
    );
  });

  it("never projects under_review as overdue, even after due date", () => {
    expect(
      projectMonthlyFeeStatus({ status: "under_review", dueDate: "2026-01-01" }, today),
    ).toMatchObject({
      persistedStatus: "under_review",
      projectedStatus: "under_review",
      isOverdue: false,
    });
  });

  it("never projects paid as overdue, even after due date", () => {
    expect(projectMonthlyFeeStatus({ status: "paid", dueDate: "2026-01-01" }, today)).toMatchObject(
      {
        persistedStatus: "paid",
        projectedStatus: "paid",
        isOverdue: false,
      },
    );
  });

  it("never projects waived as overdue, even after due date", () => {
    expect(
      projectMonthlyFeeStatus({ status: "waived", dueDate: "2026-01-01" }, today),
    ).toMatchObject({
      persistedStatus: "waived",
      projectedStatus: "waived",
      isOverdue: false,
    });
  });
});

describe("todayInSaoPaulo", () => {
  it("uses the America/Sao_Paulo calendar date for V0 overdue projection", () => {
    expect(todayInSaoPaulo(new Date("2026-01-10T02:30:00.000Z"))).toBe("2026-01-09");
    expect(todayInSaoPaulo(new Date("2026-01-10T03:30:00.000Z"))).toBe("2026-01-10");
  });

  it("makes overdue decisions from the Sao Paulo date, not the UTC date", () => {
    expect(isMonthlyFeeOverdue("open", "2026-01-09", new Date("2026-01-10T02:30:00.000Z"))).toBe(
      false,
    );
    expect(isMonthlyFeeOverdue("open", "2026-01-09", new Date("2026-01-10T03:30:00.000Z"))).toBe(
      true,
    );
  });
});
