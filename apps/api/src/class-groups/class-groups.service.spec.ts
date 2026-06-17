import { describe, expect, it, vi } from "vitest";
import { ClassGroupsService } from "./class-groups.service";

const classGroupRow = {
  id: "cg-1",
  organizationId: "org-1",
  name: "Adulto",
  defaultDurationMinutes: 60,
  status: "active",
  archivedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function selectWhereRows(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })),
      where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue(rows) })),
    })),
  };
}

function selectRows(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })),
      where: vi.fn().mockResolvedValue(rows),
    })),
  };
}

function writeSpy() {
  return vi.fn(() => ({
    values: vi.fn().mockResolvedValue(undefined),
    where: vi.fn().mockResolvedValue(undefined),
    set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  }));
}

describe("ClassGroupsService transactions", () => {
  it("creates group, schedules, tags, and student links inside one transaction", async () => {
    const txInsert = writeSpy();
    const txDelete = writeSpy();
    const txSelect = vi.fn(() => selectRows([]));
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectWhereRows([classGroupRow]))
        .mockReturnValueOnce(selectRows([]))
        .mockReturnValueOnce(selectRows([]))
        .mockReturnValueOnce(selectRows([])),
      transaction: vi.fn(async (callback) =>
        callback({ insert: txInsert, delete: txDelete, select: txSelect }),
      ),
    };
    const service = new ClassGroupsService(db as never);

    await service.create("org-1", {
      name: "Adulto",
      defaultDurationMinutes: 60,
      schedules: [{ weekday: 1, startTime: "19:30" }],
      tags: ["adulto"],
      studentIds: [],
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(txInsert).toHaveBeenCalledTimes(3);
    expect(txDelete).toHaveBeenCalledTimes(2);
    expect(txSelect).toHaveBeenCalledTimes(1);
    expect((db as { insert?: unknown }).insert).toBeUndefined();
  });
});
