import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PlatformAcademyDeletionService } from "./platform-academy-deletion.service";

const academy = {
  id: "academy-1",
  name: "Tatame Centro",
  slug: "tatame-centro",
  logo: "https://cdn.example/logos/academy-1/logo.png",
  createdAt: "2026-01-01T00:00:00.000Z",
  address: null,
  phone: null,
  instagram: null,
  responsibles: [{ id: "owner-1", name: "Owner", email: "owner@example.com" }],
};

function createDb(selectRows: unknown[][]) {
  const deletes: unknown[] = [];
  const whereConditions: unknown[] = [];
  const db = {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => Promise.resolve(selectRows.shift() ?? [])),
      })),
    })),
    transaction: vi.fn(async (callback) =>
      callback({
        delete: vi.fn().mockImplementation((table) => {
          deletes.push(table);
          return {
            where: vi.fn().mockImplementation((condition) => {
              whereConditions.push(condition);
              return Promise.resolve();
            }),
          };
        }),
      }),
    ),
  };
  return { db, deletes, whereConditions };
}

function createService(input: { selectRows: unknown[][]; deleteObjects?: () => Promise<void> }) {
  const { db, deletes, whereConditions } = createDb(input.selectRows);
  const r2 = {
    extractFileKey: vi.fn((value: string | null | undefined) =>
      value ? value.replace("https://cdn.example/", "") : null,
    ),
    deleteObjects: vi.fn(input.deleteObjects ?? (async () => undefined)),
  };
  const academies = { getAcademy: vi.fn().mockResolvedValue(academy) };
  const service = new PlatformAcademyDeletionService(db as never, r2 as never, academies as never);
  return { service, db, r2, academies, deletes, whereConditions };
}

const countRows = [
  [{ total: 2 }],
  [{ total: 3 }],
  [{ total: 4 }],
  [{ total: 5 }],
  [{ total: 6 }],
  [{ total: 1 }],
  [{ total: 7 }],
];

function collectStringValues(value: unknown, seen = new Set<unknown>()): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  if (Array.isArray(value)) return value.flatMap((item) => collectStringValues(item, seen));
  return Object.values(value).flatMap((item) => collectStringValues(item, seen));
}

describe("PlatformAcademyDeletionService", () => {
  it("previews deletion impact with academy-owned files", async () => {
    const { service, r2 } = createService({
      selectRows: [
        [{ fileKey: "receipts/academy-1/receipt.png" }],
        ...countRows.map((rows) => [...rows]),
      ],
    });

    await expect(service.preview("academy-1")).resolves.toMatchObject({
      academy: { id: "academy-1", slug: "tatame-centro" },
      affectedResponsibles: [{ id: "owner-1" }],
      impact: {
        students: 2,
        classGroups: 3,
        classSessions: 4,
        attendances: 5,
        monthlyFees: 6,
        paymentReceipts: 1,
        preRegistrationRequests: 7,
        files: 2,
      },
    });
    expect(r2.extractFileKey).toHaveBeenCalledWith(academy.logo);
  });

  it("rejects deletion without exact slug and irreversible acceptance", async () => {
    const { service } = createService({ selectRows: [] });

    await expect(
      service.delete("academy-1", { confirmationSlug: "wrong", irreversibleAccepted: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.delete("academy-1", {
        confirmationSlug: "tatame-centro",
        irreversibleAccepted: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("deletes storage before revoking affected sessions and hard-deleting the academy", async () => {
    const { service, db, r2 } = createService({
      selectRows: [
        [{ fileKey: "receipts/academy-1/receipt.png" }],
        [{ userId: "owner-1" }],
        [{ userId: "student-user-1" }, { userId: "owner-1" }],
        ...countRows.map((rows) => [...rows]),
      ],
    });

    const result = await service.delete("academy-1", {
      confirmationSlug: "tatame-centro",
      irreversibleAccepted: true,
    });

    expect(r2.deleteObjects).toHaveBeenCalledWith([
      "logos/academy-1/logo.png",
      "receipts/academy-1/receipt.png",
    ]);
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      success: true,
      deletedAcademyId: "academy-1",
      deletedFiles: 2,
      affectedResponsibles: [{ id: "owner-1" }],
    });
  });

  it("does not revoke the executing administrator session when the admin is linked to the deleted academy", async () => {
    const { service, whereConditions } = createService({
      selectRows: [
        [{ fileKey: "receipts/academy-1/receipt.png" }],
        [{ userId: "admin-1" }],
        [{ userId: "student-user-1" }, { userId: "admin-1" }],
        ...countRows.map((rows) => [...rows]),
      ],
    });

    await service.delete(
      "academy-1",
      { confirmationSlug: "tatame-centro", irreversibleAccepted: true },
      "admin-1",
    );

    const revokedSessionConditionValues = collectStringValues(whereConditions[0]);
    expect(revokedSessionConditionValues).toContain("student-user-1");
    expect(revokedSessionConditionValues).not.toContain("admin-1");
  });

  it("aborts before database deletion when storage deletion fails", async () => {
    const { service, db } = createService({
      selectRows: [
        [{ fileKey: "receipts/academy-1/receipt.png" }],
        [{ userId: "owner-1" }],
        [],
        ...countRows.map((rows) => [...rows]),
      ],
      deleteObjects: async () => {
        throw new Error("R2 unavailable");
      },
    });

    await expect(
      service.delete("academy-1", {
        confirmationSlug: "tatame-centro",
        irreversibleAccepted: true,
      }),
    ).rejects.toThrow("R2 unavailable");
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
