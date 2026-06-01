import { describe, expect, it, vi } from "vitest";
import { AuditService } from "./audit.service";

function createMockDb() {
  const insertedValues: Record<string, unknown>[] = [];
  const selectRows: Record<string, unknown>[] = [];

  const db = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockImplementation((values) => {
        insertedValues.push(values);
        return Promise.resolve();
      }),
    }),
    select: vi.fn().mockImplementation((fields) => {
      if (fields && "total" in fields) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: selectRows.length }]),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(selectRows),
                }),
              }),
            }),
          }),
        }),
      };
    }),
  };

  return { db, insertedValues };
}

describe("AuditService", () => {
  describe("write", () => {
    it("inserts an audit record with required fields", async () => {
      const { db, insertedValues } = createMockDb();
      const service = new AuditService(db as never);

      await service.write({
        adminUserId: "admin-1",
        action: "platform.dashboard.viewed",
        targetType: "platform",
      });

      expect(insertedValues).toHaveLength(1);
      const record = insertedValues[0];
      expect(record).toMatchObject({
        adminUserId: "admin-1",
        action: "platform.dashboard.viewed",
        targetType: "platform",
        result: "success",
        reason: null,
        metadata: null,
        academyId: null,
      });
      expect(record).toHaveProperty("id");
    });

    it("stores optional reason when provided", async () => {
      const { db, insertedValues } = createMockDb();
      const service = new AuditService(db as never);

      await service.write({
        adminUserId: "admin-1",
        action: "platform.user.banned",
        targetType: "user",
        targetId: "user-42",
        reason: "Violação de termos",
      });

      expect(insertedValues[0]).toMatchObject({
        reason: "Violação de termos",
        targetId: "user-42",
      });
    });

    it("stores metadata without full request payloads", async () => {
      const { db, insertedValues } = createMockDb();
      const service = new AuditService(db as never);

      await service.write({
        adminUserId: "admin-1",
        action: "platform.academy.provisioned",
        targetType: "academy",
        targetId: "academy-1",
        metadata: { ownerEmail: "owner@test.com" },
        academyId: "academy-1",
      });

      const record = insertedValues[0] as Record<string, unknown>;
      expect(record.metadata).toEqual({ ownerEmail: "owner@test.com" });
      expect(record.academyId).toBe("academy-1");
    });

    it("defaults result to success", async () => {
      const { db, insertedValues } = createMockDb();
      const service = new AuditService(db as never);

      await service.write({
        adminUserId: "admin-1",
        action: "platform.user.banned",
        targetType: "user",
      });

      expect(insertedValues[0]).toMatchObject({ result: "success" });
    });

    it("supports explicit failure result", async () => {
      const { db, insertedValues } = createMockDb();
      const service = new AuditService(db as never);

      await service.write({
        adminUserId: "admin-1",
        action: "platform.user.banned",
        targetType: "user",
        result: "failure",
      });

      expect(insertedValues[0]).toMatchObject({ result: "failure" });
    });
  });
});
