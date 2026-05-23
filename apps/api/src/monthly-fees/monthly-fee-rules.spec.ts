import { describe, expect, it } from "vitest";
import {
  clampDueDay,
  formatDueDate,
  isOverdue,
  validateCanCreateFee,
  validateStatusTransition,
} from "./monthly-fee-rules";

describe("clampDueDay", () => {
  it("returns the requested day when it exists in the month", () => {
    const result = clampDueDay(15, 2026, 3);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(2);
    expect(result.getFullYear()).toBe(2026);
  });

  it("clamps day 31 to 30 in June", () => {
    const result = clampDueDay(31, 2026, 6);
    expect(result.getDate()).toBe(30);
  });

  it("clamps day 31 to 28 in February (non-leap)", () => {
    const result = clampDueDay(31, 2025, 2);
    expect(result.getDate()).toBe(28);
  });

  it("clamps day 30 to 29 in February (leap year)", () => {
    const result = clampDueDay(30, 2024, 2);
    expect(result.getDate()).toBe(29);
  });
});

describe("formatDueDate", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(formatDueDate(new Date(2026, 2, 5))).toBe("2026-03-05");
  });

  it("zero-pads single-digit months and days", () => {
    expect(formatDueDate(new Date(2026, 0, 9))).toBe("2026-01-09");
  });
});

describe("isOverdue", () => {
  it("returns true when open and past due date", () => {
    expect(isOverdue("open", "2026-01-10", new Date(2026, 0, 11))).toBe(true);
  });

  it("returns false when open and on due date", () => {
    expect(isOverdue("open", "2026-01-10", new Date(2026, 0, 10))).toBe(false);
  });

  it("returns false when open and before due date", () => {
    expect(isOverdue("open", "2026-01-10", new Date(2026, 0, 9))).toBe(false);
  });

  it("returns false for under_review even if past due", () => {
    expect(isOverdue("under_review", "2026-01-10", new Date(2026, 0, 15))).toBe(false);
  });

  it("returns false for paid fees", () => {
    expect(isOverdue("paid", "2026-01-10", new Date(2026, 0, 15))).toBe(false);
  });

  it("returns false for waived fees", () => {
    expect(isOverdue("waived", "2026-01-10", new Date(2026, 0, 15))).toBe(false);
  });
});

describe("validateCanCreateFee", () => {
  it("passes for a student with amount and due day", () => {
    expect(() =>
      validateCanCreateFee({
        status: "active",
        monthlyAmountInCents: 15000,
        monthlyDueDay: 10,
      }),
    ).not.toThrow();
  });

  it("throws when monthlyAmountInCents is null", () => {
    expect(() =>
      validateCanCreateFee({
        status: "active",
        monthlyAmountInCents: null,
        monthlyDueDay: 10,
      }),
    ).toThrow("Aluno precisa ter valor mensal e dia de vencimento configurados.");
  });

  it("throws when monthlyDueDay is null", () => {
    expect(() =>
      validateCanCreateFee({
        status: "active",
        monthlyAmountInCents: 15000,
        monthlyDueDay: null,
      }),
    ).toThrow("Aluno precisa ter valor mensal e dia de vencimento configurados.");
  });
});

describe("validateStatusTransition", () => {
  it("allows adjust on open fee", () => {
    expect(() => validateStatusTransition("open", "adjust")).not.toThrow();
  });

  it("allows waive on open fee", () => {
    expect(() => validateStatusTransition("open", "waive")).not.toThrow();
  });

  it("allows manual_payment on open fee", () => {
    expect(() => validateStatusTransition("open", "manual_payment")).not.toThrow();
  });

  it("rejects adjust on paid fee", () => {
    expect(() => validateStatusTransition("paid", "adjust")).toThrow(
      "Mensalidade só pode ser ajustada quando está em aberto.",
    );
  });

  it("rejects waive on under_review fee", () => {
    expect(() => validateStatusTransition("under_review", "waive")).toThrow(
      "Mensalidade só pode ser dispensada quando está em aberto.",
    );
  });

  it("rejects manual_payment on waived fee", () => {
    expect(() => validateStatusTransition("waived", "manual_payment")).toThrow(
      "Mensalidade só pode ser marcada como paga quando está em aberto.",
    );
  });
});
