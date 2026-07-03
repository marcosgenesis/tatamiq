import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { StudentNotesService } from "./student-notes.service";

function createDb() {
  const inserted: Record<string, unknown>[] = [];
  const db = {
    insert: vi.fn(() => ({
      values: vi.fn((v: Record<string, unknown>) => {
        inserted.push(v);
        return Promise.resolve();
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ id: "note-1" }])),
      })),
    })),
  };
  return { db, inserted };
}

describe("StudentNotesService cross-tenant guard", () => {
  it("rejects creating a note for a student outside the academy", async () => {
    const { db, inserted } = createDb();
    const scope = {
      assertStudentBelongsToAcademia: vi
        .fn()
        .mockRejectedValue(new NotFoundException("Aluno não encontrado.")),
    };
    const service = new StudentNotesService(db as never, scope as never);

    await expect(
      service.create("my-org", "foreign-student", "user-1", { content: "x", isVisible: false }),
    ).rejects.toThrow("Aluno não encontrado.");
    expect(scope.assertStudentBelongsToAcademia).toHaveBeenCalledWith("my-org", "foreign-student");
    expect(inserted).toHaveLength(0);
  });

  it("rejects listing notes for a student outside the academy", async () => {
    const { db } = createDb();
    const scope = {
      assertStudentBelongsToAcademia: vi
        .fn()
        .mockRejectedValue(new NotFoundException("Aluno não encontrado.")),
    };
    const service = new StudentNotesService(db as never, scope as never);

    await expect(service.listAll("my-org", "foreign-student")).rejects.toThrow(
      "Aluno não encontrado.",
    );
  });
});
