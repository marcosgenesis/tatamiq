import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcademyOwnershipService, OWNERLESS_CONFIRMATION_TEXT } from "./academy-ownership.service";

type MockRow = Record<string, unknown>;

function createMockDb() {
  const insertedRows: MockRow[] = [];
  const deletedConditions: unknown[] = [];
  let selectResults: MockRow[][] = [];
  let selectCallIndex = 0;

  const db = {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            const result = selectResults[selectCallIndex] ?? [];
            selectCallIndex += 1;
            return Promise.resolve(result);
          }),
        }),
      }),
    })),
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((values) => {
        insertedRows.push(values);
        return Promise.resolve();
      }),
    })),
    delete: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockImplementation((condition) => {
        deletedConditions.push(condition);
        return Promise.resolve();
      }),
    })),
  };

  return {
    db,
    insertedRows,
    deletedConditions,
    setSelectResults: (results: MockRow[][]) => {
      selectResults = results;
      selectCallIndex = 0;
    },
  };
}

describe("AcademyOwnershipService", () => {
  let mock: ReturnType<typeof createMockDb>;
  let reservedAccounts: {
    createOrReuse: ReturnType<typeof vi.fn>;
    firstAccessUrl: ReturnType<typeof vi.fn>;
  };
  let service: AcademyOwnershipService;

  beforeEach(() => {
    mock = createMockDb();
    reservedAccounts = {
      createOrReuse: vi.fn().mockResolvedValue({
        user: { id: "owner-2", email: "second@tatamiq.local", name: "Second" },
        isNew: false,
        firstAccessLink: null,
      }),
      firstAccessUrl: vi.fn((token: string) => `http://localhost:5173/first-access/${token}`),
    };
    service = new AcademyOwnershipService(mock.db as never, reservedAccounts as never);
  });

  describe("addResponsibleByEmail", () => {
    it("adds another responsible without removing existing responsibles", async () => {
      mock.setSelectResults([[{ id: "academy-1" }], []]);

      const result = await service.addResponsibleByEmail("academy-1", {
        ownerEmail: "Second@Tatamiq.Local",
        ownerName: "Second",
      });

      expect(result).toMatchObject({ ownerUserId: "owner-2", ownerWasCreated: false });
      expect(mock.deletedConditions).toHaveLength(0);
      expect(mock.insertedRows).toHaveLength(1);
      expect(mock.insertedRows[0]).toMatchObject({
        organizationId: "academy-1",
        userId: "owner-2",
        role: "owner",
      });
      expect(reservedAccounts.createOrReuse).toHaveBeenCalledWith("second@tatamiq.local", "Second");
    });

    it("is idempotent when the responsible is already linked", async () => {
      mock.setSelectResults([[{ id: "academy-1" }], [{ id: "member-1" }]]);

      const result = await service.addResponsibleByEmail("academy-1", {
        ownerEmail: "second@tatamiq.local",
      });

      expect(result.ownerUserId).toBe("owner-2");
      expect(mock.insertedRows).toHaveLength(0);
      expect(mock.deletedConditions).toHaveLength(0);
    });

    it("returns a first access URL when adding a reserved account", async () => {
      reservedAccounts.createOrReuse.mockResolvedValueOnce({
        user: { id: "reserved-1", email: "reserved@tatamiq.local", name: "Reserved" },
        isNew: true,
        firstAccessLink: "raw-token",
      });
      mock.setSelectResults([[{ id: "academy-1" }], []]);

      const result = await service.addResponsibleByEmail("academy-1", {
        ownerEmail: "reserved@tatamiq.local",
        ownerName: "Reserved",
      });

      expect(result).toMatchObject({
        ownerUserId: "reserved-1",
        ownerWasCreated: true,
        firstAccessLink: "http://localhost:5173/first-access/raw-token",
      });
    });
  });

  describe("removeResponsible", () => {
    it("removes only the selected responsible when another responsible remains", async () => {
      mock.setSelectResults([[{ id: "academy-1" }], [{ id: "member-target" }], [{ total: 2 }]]);

      await expect(
        service.removeResponsible("academy-1", { userId: "owner-to-remove" }),
      ).resolves.toEqual({ leftOwnerless: false });

      expect(mock.deletedConditions).toHaveLength(1);
    });

    it("fails when the selected user is not a responsible of the academy", async () => {
      mock.setSelectResults([[{ id: "academy-1" }], [], [{ total: 2 }]]);

      await expect(
        service.removeResponsible("academy-1", { userId: "not-an-owner" }),
      ).rejects.toThrow(NotFoundException);

      expect(mock.deletedConditions).toHaveLength(0);
    });

    it("blocks removing the final responsible without the strong confirmation text", async () => {
      mock.setSelectResults([[{ id: "academy-1" }], [{ id: "member-target" }], [{ total: 1 }]]);

      await expect(
        service.removeResponsible("academy-1", {
          userId: "only-owner",
          allowLeavingOwnerless: true,
          ownerlessConfirmation: "sem responsavel",
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mock.deletedConditions).toHaveLength(0);
    });

    it("allows removing the final responsible with the strong confirmation text", async () => {
      mock.setSelectResults([[{ id: "academy-1" }], [{ id: "member-target" }], [{ total: 1 }]]);

      await expect(
        service.removeResponsible("academy-1", {
          userId: "only-owner",
          allowLeavingOwnerless: true,
          ownerlessConfirmation: OWNERLESS_CONFIRMATION_TEXT,
        }),
      ).resolves.toEqual({ leftOwnerless: true });

      expect(mock.deletedConditions).toHaveLength(1);
    });
  });
});
