import { describe, expect, it, vi } from "vitest";
import { StudentsService } from "./students.service";

const studentRow = {
  id: "student-1",
  organizationId: "org-1",
  name: "Aluno E2E",
  birthDate: "1990-01-01",
  enrollmentDate: "2026-01-01",
  status: "active",
  inactiveAt: null,
  phone: null,
  email: null,
  monthlyAmountInCents: null,
  monthlyDueDay: null,
  currentBeltId: "belt-1",
  currentDegree: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function selectResult(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue(rows) })) })),
      where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue(rows) })),
    })),
  };
}

function insertSpy() {
  return vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
}

describe("StudentsService transactions", () => {
  it("creates student and guardian inside one transaction", async () => {
    const txInsert = insertSpy();
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectResult([]))
        .mockReturnValueOnce(selectResult([{ student: studentRow, belt: null }]))
        .mockReturnValueOnce(selectResult([])),
      transaction: vi.fn(async (callback) => callback({ insert: txInsert })),
    };
    const belts = { findById: vi.fn().mockResolvedValue({ id: "belt-1" }) };
    const studentAccess = { accessStatesForStudents: vi.fn().mockResolvedValue(new Map()) };
    const service = new StudentsService(db as never, studentAccess as never, belts as never);

    await service.create("org-1", {
      name: "Aluno E2E",
      birthDate: "1990-01-01",
      enrollmentDate: "2026-01-01",
      phone: "",
      email: "student@example.com",
      monthlyAmountInCents: null,
      monthlyDueDay: null,
      currentBeltId: "belt-1",
      currentDegree: 0,
      guardian: { name: "Responsável", phone: "85999999999", email: "", relationship: "" },
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(txInsert).toHaveBeenCalledTimes(2);
    expect((db as { insert?: unknown }).insert).toBeUndefined();
  });
});
