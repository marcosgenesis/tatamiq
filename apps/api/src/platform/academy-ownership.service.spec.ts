import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AcademyOwnershipService } from "./academy-ownership.service";

type QueryRows = unknown[];

function makeSelectQuery(rows: QueryRows) {
  const query = {
    from: vi.fn(() => query),
    innerJoin: vi.fn(() => query),
    where: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve(rows)),
  };
  return query;
}

function makeDeleteQuery() {
  return {
    where: vi.fn(() => Promise.resolve()),
  };
}

function createService(options: {
  academyExists?: boolean;
  targetResponsibleExists?: boolean;
  totalOwners?: number;
}) {
  const selectRows: QueryRows[] = [
    options.academyExists === false ? [] : [{ id: "academy-1" }],
    options.targetResponsibleExists === false ? [] : [{ id: "member-target" }],
    [{ total: options.totalOwners ?? 2 }],
  ];
  const deleteQuery = makeDeleteQuery();
  const db = {
    select: vi.fn(() => makeSelectQuery(selectRows.shift() ?? [])),
    delete: vi.fn(() => deleteQuery),
  };

  return {
    db,
    deleteQuery,
    service: new AcademyOwnershipService(db as never, {} as never),
  };
}

describe("AcademyOwnershipService.removeResponsible", () => {
  it("removes only the selected responsible when another responsible remains", async () => {
    const { service, db, deleteQuery } = createService({ totalOwners: 2 });

    await expect(
      service.removeResponsible("academy-1", { userId: "owner-to-remove" }),
    ).resolves.toBeUndefined();

    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(deleteQuery.where).toHaveBeenCalledTimes(1);
  });

  it("fails when the selected user is not a responsible of the academy", async () => {
    const { service, db } = createService({ targetResponsibleExists: false, totalOwners: 2 });

    await expect(
      service.removeResponsible("academy-1", { userId: "not-an-owner" }),
    ).rejects.toThrow(NotFoundException);

    expect(db.delete).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before removing the final responsible", async () => {
    const { service, db } = createService({ totalOwners: 1 });

    await expect(service.removeResponsible("academy-1", { userId: "only-owner" })).rejects.toThrow(
      BadRequestException,
    );

    expect(db.delete).not.toHaveBeenCalled();
  });
});
