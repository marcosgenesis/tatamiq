import { describe, expect, it } from "vitest";
import {
  getMondayWeekStart,
  listWeekDates,
  saoPauloDatePart,
  saoPauloTimePart,
  toSaoPauloScheduledStartAt,
} from "./schedule-rules";

describe("schedule date rules", () => {
  it("calculates Monday as week start for any date", () => {
    expect(getMondayWeekStart("2026-05-20")).toBe("2026-05-18");
    expect(getMondayWeekStart("2026-05-24")).toBe("2026-05-18");
    expect(getMondayWeekStart("2026-05-25")).toBe("2026-05-25");
  });

  it("encodes scheduled starts as São Paulo wall time", () => {
    const scheduledStartAt = toSaoPauloScheduledStartAt("2026-05-20", "19:30");
    const date = new Date(scheduledStartAt);

    expect(scheduledStartAt).toBe("2026-05-20T22:30:00.000Z");
    expect(saoPauloDatePart(date)).toBe("2026-05-20");
    expect(saoPauloTimePart(date)).toBe("19:30");
    expect(
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date),
    ).toBe("19:30");
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
