import { describe, expect, it } from "vitest";
import { getMondayWeekStart, listWeekDates } from "./schedule-rules";

describe("schedule date rules", () => {
  it("calculates Monday as week start for any date", () => {
    expect(getMondayWeekStart("2026-05-20")).toBe("2026-05-18");
    expect(getMondayWeekStart("2026-05-24")).toBe("2026-05-18");
    expect(getMondayWeekStart("2026-05-25")).toBe("2026-05-25");
  });

  it("builds seven dates from Monday to Sunday", () => {
    expect(listWeekDates("2026-05-18")).toEqual([
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
      "2026-05-23",
      "2026-05-24",
    ]);
  });
});
