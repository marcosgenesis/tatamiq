import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AcademiaScope } from "./academia-scope.service";

type MockRow = Record<string, unknown>;

function createMockDb(selectResults: MockRow[][] = []) {
  let selectCallIndex = 0;
  const where = vi.fn().mockReturnValue({
    limit: vi.fn().mockImplementation(() => {
      const result = selectResults[selectCallIndex] ?? [];
      selectCallIndex++;
      return Promise.resolve(result);
    }),
  });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return {
    db: { select },
    select,
    from,
    where,
  };
}

function student(overrides: MockRow = {}): MockRow {
  return {
    id: "student-1",
    organizationId: "org-1",
    name: "Aluno Um",
    status: "active",
    ...overrides,
  };
}

function monthlyFee(overrides: MockRow = {}): MockRow {
  return {
    id: "fee-1",
    organizationId: "org-1",
    studentId: "student-1",
    status: "open",
    ...overrides,
  };
}

function pixReceipt(overrides: MockRow = {}): MockRow {
  return {
    id: "receipt-1",
    organizationId: "org-1",
    monthlyFeeId: "fee-1",
    studentId: "student-1",
    status: "pending",
    ...overrides,
  };
}

describe("AcademiaScope", () => {
  it("asserts that an Aluno belongs to an Academia", async () => {
    const mock = createMockDb([[student()]]);
    const scope = new AcademiaScope(mock.db as never);

    await expect(scope.assertStudentBelongsToAcademia("org-1", "student-1")).resolves.toMatchObject(
      {
        id: "student-1",
        organizationId: "org-1",
      },
    );
  });

  it("hides cross-academy and missing Aluno as not found", async () => {
    const mock = createMockDb([[]]);
    const scope = new AcademiaScope(mock.db as never);

    await expect(scope.assertStudentBelongsToAcademia("org-1", "student-2")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("asserts that a Mensalidade belongs to an Academia", async () => {
    const mock = createMockDb([[monthlyFee()]]);
    const scope = new AcademiaScope(mock.db as never);

    await expect(scope.assertMonthlyFeeBelongsToAcademia("org-1", "fee-1")).resolves.toMatchObject({
      id: "fee-1",
      organizationId: "org-1",
    });
  });

  it("hides cross-academy and missing Mensalidade as not found", async () => {
    const mock = createMockDb([[]]);
    const scope = new AcademiaScope(mock.db as never);

    await expect(scope.assertMonthlyFeeBelongsToAcademia("org-1", "fee-2")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("asserts that a student Mensalidade belongs to the Academia and Aluno", async () => {
    const mock = createMockDb([[monthlyFee()]]);
    const scope = new AcademiaScope(mock.db as never);

    await expect(
      scope.assertStudentMonthlyFeeBelongsToAcademia("org-1", "student-1", "fee-1"),
    ).resolves.toMatchObject({ id: "fee-1", studentId: "student-1", organizationId: "org-1" });
  });

  it("asserts that a Comprovante Pix belongs to an Academia", async () => {
    const mock = createMockDb([[pixReceipt()]]);
    const scope = new AcademiaScope(mock.db as never);

    await expect(
      scope.assertPixReceiptBelongsToAcademia("org-1", "receipt-1"),
    ).resolves.toMatchObject({
      id: "receipt-1",
      organizationId: "org-1",
    });
  });

  it("asserts that a Comprovante Pix belongs to the expected Mensalidade", async () => {
    const mock = createMockDb([[pixReceipt()]]);
    const scope = new AcademiaScope(mock.db as never);

    await expect(
      scope.assertPixReceiptBelongsToAcademia("org-1", "receipt-1", "fee-1"),
    ).resolves.toMatchObject({ id: "receipt-1", monthlyFeeId: "fee-1", organizationId: "org-1" });
  });

  it("hides cross-academy, missing, and wrong-fee Comprovante Pix as not found", async () => {
    const mock = createMockDb([[]]);
    const scope = new AcademiaScope(mock.db as never);

    await expect(
      scope.assertPixReceiptBelongsToAcademia("org-1", "receipt-2", "fee-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
