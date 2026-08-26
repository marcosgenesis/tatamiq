import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassesService } from "./classes.service";

function activeRow(id: string, actualStartAt: string | null, durationMinutes: number) {
  return {
    id,
    organizationId: "org-1",
    actualStartAt: actualStartAt ? new Date(actualStartAt) : null,
    durationMinutes,
  };
}

describe("ClassesService.expireDueClasses", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T20:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ends classes whose actual start plus duration is in the past, keeping the computed end", async () => {
    const rows = [
      activeRow("due", "2026-08-26T18:30:00.000Z", 60), // ends 19:30 -> due
      activeRow("running", "2026-08-26T19:30:00.000Z", 60), // ends 20:30 -> still active
      activeRow("no-start", null, 60),
    ];
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn(() => ({ where }));
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })) })),
      update: vi.fn(() => ({ set })),
    };

    const expired = await new ClassesService(db as never).expireDueClasses("org-1");

    expect(expired).toBe(1);
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ended", endedAt: new Date("2026-08-26T19:30:00.000Z") }),
    );
  });

  it("returns zero when nothing is due", async () => {
    const rows = [activeRow("running", "2026-08-26T19:45:00.000Z", 60)];
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })) })),
      update: vi.fn(),
    };

    expect(await new ClassesService(db as never).expireDueClasses()).toBe(0);
    expect(db.update).not.toHaveBeenCalled();
  });
});
