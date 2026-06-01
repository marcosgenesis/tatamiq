import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentAccessActivationService } from "./student-access-activation.service";

function createMockTx(selectResults: unknown[][] = [[], []]) {
  const inserted: unknown[] = [];
  let selectCallIndex = 0;

  return {
    inserted,
    tx: {
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
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((values) => {
          inserted.push(values);
          return Promise.resolve();
        }),
      })),
    },
  };
}

describe("StudentAccessActivationService", () => {
  let service: StudentAccessActivationService;

  beforeEach(() => {
    service = new StudentAccessActivationService();
  });

  it("creates active access and acceptance with the expected fields", async () => {
    const mock = createMockTx();

    const result = await service.activate(mock.tx as never, {
      organizationId: "org-1",
      studentId: "student-1",
      authUserId: "user-1",
      termsVersion: "student-access-v1",
    });

    expect(result.accessId).toBeTruthy();
    expect(mock.inserted).toHaveLength(2);
    expect(mock.inserted[0]).toMatchObject({
      id: result.accessId,
      organizationId: "org-1",
      studentId: "student-1",
      authUserId: "user-1",
      status: "active",
      revokedAt: null,
      revokedByUserId: null,
    });
    expect(mock.inserted[1]).toMatchObject({
      organizationId: "org-1",
      studentAccessId: result.accessId,
      studentId: "student-1",
      authUserId: "user-1",
      termsVersion: "student-access-v1",
    });
  });

  it("rejects when the student already has active access", async () => {
    const mock = createMockTx([[{ id: "access-1" }], []]);

    await expect(
      service.activate(mock.tx as never, {
        organizationId: "org-1",
        studentId: "student-1",
        authUserId: "user-1",
        termsVersion: "student-access-v1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mock.inserted).toHaveLength(0);
  });

  it("rejects when the auth user already has active access", async () => {
    const mock = createMockTx([[], [{ id: "access-1" }]]);

    await expect(
      service.activate(mock.tx as never, {
        organizationId: "org-1",
        studentId: "student-1",
        authUserId: "user-1",
        termsVersion: "student-access-v1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mock.inserted).toHaveLength(0);
  });
});
