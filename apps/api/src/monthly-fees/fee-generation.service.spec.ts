import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeeGenerationService } from "./fee-generation.service";

type StudentRow = {
  id: string;
  monthlyAmountInCents: number | null;
  monthlyDueDay: number | null;
};

type QueryRows = Array<Record<string, unknown>>;

function createDbMock(options: {
  ownerRows?: QueryRows;
  students?: StudentRow[];
  existingFeeRows?: QueryRows;
  cronOrganizations?: QueryRows;
}) {
  const inserted: Array<Record<string, unknown>> = [];
  const selectResults: Array<{ rows: QueryRows; usesLimit: boolean }> = [
    { rows: options.ownerRows ?? [{ id: "member-owner" }], usesLimit: true },
    {
      rows: options.students ?? [
        { id: "student-1", monthlyAmountInCents: 12_000, monthlyDueDay: 10 },
      ],
      usesLimit: false,
    },
    { rows: options.existingFeeRows ?? [], usesLimit: true },
  ];

  return {
    inserted,
    db: {
      selectDistinct: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(options.cronOrganizations ?? [])),
        })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            const result = selectResults.shift() ?? { rows: [], usesLimit: false };
            if (result.usesLimit) return { limit: vi.fn().mockResolvedValue(result.rows) };
            return Promise.resolve(result.rows);
          }),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(async (value: Record<string, unknown>) => {
          inserted.push(value);
        }),
      })),
    },
  };
}

describe("FeeGenerationService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("catchUp creates a missing current-month fee after the due day", async () => {
    const { db, inserted } = createDbMock({});
    const service = new FeeGenerationService(db as never);

    const created = await service.catchUp("org-1");

    expect(created).toBe(1);
    expect(inserted).toMatchObject([
      {
        organizationId: "org-1",
        studentId: "student-1",
        referenceYear: 2026,
        referenceMonth: 6,
        amountInCents: 12_000,
        dueDate: "2026-06-10",
        status: "open",
      },
    ]);
  });

  it("cron generation still skips fees after the due day", async () => {
    const { db, inserted } = createDbMock({ cronOrganizations: [{ organizationId: "org-1" }] });
    const service = new FeeGenerationService(db as never);

    await service.cronGenerate();

    expect(inserted).toHaveLength(0);
  });

  it("skips existing fees for the same student and reference month", async () => {
    const { db, inserted } = createDbMock({ existingFeeRows: [{ id: "fee-1" }] });
    const service = new FeeGenerationService(db as never);

    const created = await service.catchUp("org-1");

    expect(created).toBe(0);
    expect(inserted).toHaveLength(0);
  });

  it("skips generation for ownerless organizations", async () => {
    const { db, inserted } = createDbMock({ ownerRows: [] });
    const service = new FeeGenerationService(db as never);

    const created = await service.catchUp("org-1");

    expect(created).toBe(0);
    expect(inserted).toHaveLength(0);
  });
});
