import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReservedAccountService } from "./reserved-account.service";

vi.mock("better-auth/crypto", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password_value"),
}));

type MockRow = Record<string, unknown>;

function createMockDb() {
  const insertedRows: { table: string; values: MockRow }[] = [];
  const deletedConditions: unknown[] = [];
  const updatedSets: { set: MockRow; condition: unknown }[] = [];
  let selectResults: MockRow[][] = [];
  let selectCallIndex = 0;

  const db = {
    insert: vi.fn().mockImplementation((table) => {
      const tableName = table?.name ?? table?.[Symbol.for("drizzle:Name")] ?? "unknown";
      return {
        values: vi.fn().mockImplementation((values) => {
          insertedRows.push({ table: tableName, values });
          return {
            returning: vi.fn().mockResolvedValue([values]),
          };
        }),
      };
    }),
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            const result = selectResults[selectCallIndex] ?? [];
            selectCallIndex++;
            return Promise.resolve(result);
          }),
        }),
      }),
    })),
    delete: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockImplementation((condition) => {
        deletedConditions.push(condition);
        return Promise.resolve();
      }),
    })),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation((setValues) => ({
        where: vi.fn().mockImplementation((condition) => {
          updatedSets.push({ set: setValues, condition });
          return Promise.resolve();
        }),
      })),
    })),
  };

  return {
    db,
    insertedRows,
    deletedConditions,
    updatedSets,
    setSelectResults: (results: MockRow[][]) => {
      selectResults = results;
      selectCallIndex = 0;
    },
  };
}

describe("ReservedAccountService", () => {
  let mock: ReturnType<typeof createMockDb>;
  let service: ReservedAccountService;

  beforeEach(() => {
    mock = createMockDb();
    service = new ReservedAccountService(mock.db as never);
  });

  describe("createOrReuse", () => {
    it("reuses existing user by email (returns isNew=false)", async () => {
      const existingUser = {
        id: "user-1",
        name: "Existing",
        email: "existing@test.com",
        banned: false,
      };
      mock.setSelectResults([[existingUser]]);

      const result = await service.createOrReuse("existing@test.com", "Existing");

      expect(result.isNew).toBe(false);
      expect(result.user).toEqual(existingUser);
      expect(result.firstAccessLink).toBeNull();
      expect(mock.insertedRows).toHaveLength(0);
    });

    it("creates reserved user for new email (returns isNew=true with link)", async () => {
      mock.setSelectResults([[]]);

      const result = await service.createOrReuse("new@test.com", "New User");

      expect(result.isNew).toBe(true);
      expect(result.firstAccessLink).toBeTruthy();
      expect(typeof result.firstAccessLink).toBe("string");
      expect(result.user).toBeDefined();
      expect(mock.insertedRows).toHaveLength(2);
    });

    it("reserved user has banned=true and banReason='reserved_account'", async () => {
      mock.setSelectResults([[]]);

      await service.createOrReuse("new@test.com", "New User");

      const userInsert = mock.insertedRows.find((r) => r.values.email === "new@test.com");
      expect(userInsert).toBeDefined();
      expect(userInsert!.values.banned).toBe(true);
      expect(userInsert!.values.banReason).toBe("reserved_account");
    });

    it("first access link token is stored as SHA-256 hash in verification table", async () => {
      mock.setSelectResults([[]]);

      const result = await service.createOrReuse("new@test.com", "New User");

      const verificationInsert = mock.insertedRows.find(
        (r) =>
          typeof r.values.identifier === "string" &&
          r.values.identifier.startsWith("first-access:"),
      );
      expect(verificationInsert).toBeDefined();

      const expectedHash = createHash("sha256").update(result.firstAccessLink!).digest("hex");
      expect(verificationInsert!.values.value).toBe(expectedHash);
    });

    it("first access links expire after 7 days", async () => {
      mock.setSelectResults([[]]);

      const before = Date.now();
      await service.createOrReuse("new@test.com", "New User");
      const after = Date.now();

      const verificationInsert = mock.insertedRows.find(
        (r) =>
          typeof r.values.identifier === "string" &&
          r.values.identifier.startsWith("first-access:"),
      );
      const expiresAt = verificationInsert!.values.expiresAt as Date;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(after + sevenDaysMs);
    });

    it("normalizes email to lowercase", async () => {
      mock.setSelectResults([[]]);

      await service.createOrReuse("NEW@TEST.COM", "New User");

      const userInsert = mock.insertedRows.find((r) => r.values.email !== undefined);
      expect(userInsert!.values.email).toBe("new@test.com");
    });
  });

  describe("regenerateFirstAccessLink", () => {
    it("creates new link and invalidates previous", async () => {
      mock.setSelectResults([[{ id: "user-1", name: "Test", email: "test@test.com" }]]);

      const token = await service.regenerateFirstAccessLink("user-1");

      expect(typeof token).toBe("string");
      expect(token).toBeTruthy();
      expect(mock.deletedConditions).toHaveLength(1);
      expect(mock.insertedRows).toHaveLength(1);

      const verificationInsert = mock.insertedRows[0];
      expect(verificationInsert.values.identifier).toBe("first-access:user-1");

      const expectedHash = createHash("sha256").update(token).digest("hex");
      expect(verificationInsert.values.value).toBe(expectedHash);
    });

    it("throws NotFoundException if user does not exist", async () => {
      mock.setSelectResults([[]]);

      await expect(service.regenerateFirstAccessLink("nonexistent")).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("completeFirstAccess", () => {
    it("unbans the user and sets password", async () => {
      const rawToken = "test-token-uuid";
      const hashedToken = createHash("sha256").update(rawToken).digest("hex");
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const verificationRecord = {
        id: "ver-1",
        identifier: "first-access:user-1",
        value: hashedToken,
        expiresAt: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingUser = {
        id: "user-1",
        name: "Test",
        email: "test@test.com",
        banned: true,
        banReason: "reserved_account",
      };

      mock.setSelectResults([[verificationRecord], [existingUser]]);

      const result = await service.completeFirstAccess(rawToken, "new-password-123");

      expect(result).toEqual(existingUser);

      expect(mock.updatedSets).toHaveLength(1);
      expect(mock.updatedSets[0].set).toMatchObject({
        banned: false,
        banReason: null,
      });

      const accountInsert = mock.insertedRows.find((r) => r.values.providerId === "credential");
      expect(accountInsert).toBeDefined();
      expect(accountInsert!.values.userId).toBe("user-1");
      expect(accountInsert!.values.password).toBe("hashed_password_value");

      expect(mock.deletedConditions).toHaveLength(1);
    });

    it("throws for invalid token", async () => {
      mock.setSelectResults([[]]);

      await expect(service.completeFirstAccess("bad-token", "password")).rejects.toThrow(
        "Invalid or expired first-access token",
      );
    });

    it("throws for expired token", async () => {
      const rawToken = "expired-token";
      const hashedToken = createHash("sha256").update(rawToken).digest("hex");
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const verificationRecord = {
        id: "ver-1",
        identifier: "first-access:user-1",
        value: hashedToken,
        expiresAt: pastDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mock.setSelectResults([[verificationRecord]]);

      await expect(service.completeFirstAccess(rawToken, "password")).rejects.toThrow(
        "Invalid or expired first-access token",
      );
    });
  });
});
