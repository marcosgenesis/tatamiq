import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AcademyOwnershipService, OWNERLESS_CONFIRMATION_TEXT } from "./academy-ownership.service";

type QueryRows = Array<Record<string, unknown>>;

function createRemoveResponsibleDb(
  ownerCount: number,
  targetRows: QueryRows = [{ id: "member-1" }],
) {
  const deleted: unknown[] = [];
  let selectCall = 0;
  return {
    deleted,
    db: {
      select: vi.fn(() => {
        selectCall += 1;
        if (selectCall === 1) {
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: "academy-1" }]) })),
            })),
          };
        }
        if (selectCall === 2) {
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue(targetRows) })),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ total: ownerCount }]),
          })),
        };
      }),
      delete: vi.fn(() => ({
        where: vi.fn((condition) => {
          deleted.push(condition);
          return Promise.resolve();
        }),
      })),
    },
  };
}

describe("AcademyOwnershipService.removeResponsible", () => {
  it("blocks removing the final responsible without the strong confirmation text", async () => {
    const { db, deleted } = createRemoveResponsibleDb(1);
    const service = new AcademyOwnershipService(db as never, {} as never);

    await expect(
      service.removeResponsible("academy-1", {
        userId: "owner-1",
        allowLeavingOwnerless: true,
        ownerlessConfirmation: "sim",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(deleted).toHaveLength(0);
  });

  it("allows removing the final responsible with explicit ownerless confirmation", async () => {
    const { db, deleted } = createRemoveResponsibleDb(1);
    const service = new AcademyOwnershipService(db as never, {} as never);

    await expect(
      service.removeResponsible("academy-1", {
        userId: "owner-1",
        allowLeavingOwnerless: true,
        ownerlessConfirmation: OWNERLESS_CONFIRMATION_TEXT,
      }),
    ).resolves.toEqual({ leftOwnerless: true });

    expect(deleted).toHaveLength(1);
  });

  it("does not require ownerless confirmation when another responsible remains", async () => {
    const { db, deleted } = createRemoveResponsibleDb(2);
    const service = new AcademyOwnershipService(db as never, {} as never);

    await expect(service.removeResponsible("academy-1", { userId: "owner-1" })).resolves.toEqual({
      leftOwnerless: false,
    });

    expect(deleted).toHaveLength(1);
  });

  it("rejects removal when the target user is not a responsible for the academy", async () => {
    const { db, deleted } = createRemoveResponsibleDb(0, []);
    const service = new AcademyOwnershipService(db as never, {} as never);

    await expect(
      service.removeResponsible("academy-1", {
        userId: "missing-owner",
        allowLeavingOwnerless: true,
        ownerlessConfirmation: OWNERLESS_CONFIRMATION_TEXT,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(deleted).toHaveLength(0);
  });
});
