import { describe, expect, it } from "vitest";
import { clampDueDay, formatDueDate, isOverdue } from "./monthly-fee-rules";

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
    expect(isOverdue("open", "2026-01-10", new Date("2026-01-11T15:00:00.000Z"))).toBe(true);
  });

  it("returns false when open and on due date", () => {
    expect(isOverdue("open", "2026-01-10", new Date("2026-01-10T15:00:00.000Z"))).toBe(false);
  });

  it("returns false when open and before due date", () => {
    expect(isOverdue("open", "2026-01-10", new Date("2026-01-09T15:00:00.000Z"))).toBe(false);
  });

  it("returns false for under_review even if past due", () => {
    expect(isOverdue("under_review", "2026-01-10", new Date("2026-01-15T15:00:00.000Z"))).toBe(
      false,
    );
  });

  it("returns false for paid fees", () => {
    expect(isOverdue("paid", "2026-01-10", new Date("2026-01-15T15:00:00.000Z"))).toBe(false);
  });

  it("returns false for waived fees", () => {
    expect(isOverdue("waived", "2026-01-10", new Date("2026-01-15T15:00:00.000Z"))).toBe(false);
  });
});
