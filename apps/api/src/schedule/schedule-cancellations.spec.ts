import { describe, expect, it } from "vitest";
import { findActiveRecurringCancellation } from "./schedule-cancellations";

describe("schedule cancellations", () => {
  it("matches only active cancellation for the same schedule and date", () => {
    const cancellation = findActiveRecurringCancellation(
      [
        {
          id: "other-date",
          classGroupScheduleId: "schedule-1",
          occurrenceDate: "2026-05-19",
          revertedAt: null,
        },
        {
          id: "reverted",
          classGroupScheduleId: "schedule-1",
          occurrenceDate: "2026-05-20",
          revertedAt: new Date(),
        },
        {
          id: "active",
          classGroupScheduleId: "schedule-1",
          occurrenceDate: "2026-05-20",
          revertedAt: null,
        },
      ],
      "schedule-1",
      "2026-05-20",
    );

    expect(cancellation?.id).toBe("active");
  });
});
