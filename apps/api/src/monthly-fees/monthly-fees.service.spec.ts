import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MonthlyFeesService } from "./monthly-fees.service";
import { issueUploadKeySignature } from "./upload-key-signature";

describe("MonthlyFeesService AcademiaScope reads", () => {
  const db = { select: vi.fn() };
  const r2 = { generateReadUrl: vi.fn(), generatePresignedUrl: vi.fn() };
  const lifecycle = { assertCanSubmitReceipt: vi.fn(), submitReceipt: vi.fn() };
  const academiaScope = {
    assertStudentBelongsToAcademia: vi.fn(),
    assertMonthlyFeeBelongsToAcademia: vi.fn(),
    assertStudentMonthlyFeeBelongsToAcademia: vi.fn(),
    assertPixReceiptBelongsToAcademia: vi.fn(),
  };

  let service: MonthlyFeesService;

  beforeEach(() => {
    vi.restoreAllMocks();
    db.select = vi.fn();
    r2.generateReadUrl = vi.fn();
    r2.generatePresignedUrl = vi.fn();
    lifecycle.assertCanSubmitReceipt = vi.fn();
    lifecycle.submitReceipt = vi.fn();
    academiaScope.assertStudentBelongsToAcademia = vi.fn();
    academiaScope.assertMonthlyFeeBelongsToAcademia = vi.fn();
    academiaScope.assertStudentMonthlyFeeBelongsToAcademia = vi.fn();
    academiaScope.assertPixReceiptBelongsToAcademia = vi.fn();
    service = new MonthlyFeesService(
      db as never,
      r2 as never,
      lifecycle as never,
      academiaScope as never,
    );
  });

  it("does not open instructor Mensalidade detail when AcademiaScope reports not found", async () => {
    academiaScope.assertMonthlyFeeBelongsToAcademia.mockRejectedValue(
      new NotFoundException("Mensalidade não encontrada."),
    );

    await expect(service.get("org-1", "fee-from-other-academy")).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.select).not.toHaveBeenCalled();
  });

  it("does not generate an instructor receipt signed URL when the receipt is outside scope", async () => {
    academiaScope.assertMonthlyFeeBelongsToAcademia.mockResolvedValue({ id: "fee-1" });
    academiaScope.assertPixReceiptBelongsToAcademia.mockRejectedValue(
      new NotFoundException("Comprovante não encontrado."),
    );

    await expect(service.receiptViewUrl("org-1", "fee-1", "receipt-other")).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(academiaScope.assertPixReceiptBelongsToAcademia).toHaveBeenCalledWith(
      "org-1",
      "receipt-other",
      "fee-1",
    );
    expect(r2.generateReadUrl).not.toHaveBeenCalled();
  });

  it("does not list student Mensalidades when the Aluno is outside scope", async () => {
    academiaScope.assertStudentBelongsToAcademia.mockRejectedValue(
      new NotFoundException("Aluno não encontrado."),
    );

    await expect(service.studentFees("student-other", "org-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(db.select).not.toHaveBeenCalled();
  });

  it("does not create a student receipt upload URL when the Mensalidade is outside student scope", async () => {
    lifecycle.assertCanSubmitReceipt.mockRejectedValue(
      new NotFoundException("Mensalidade não encontrada."),
    );

    await expect(
      service.generateUploadUrl("org-1", "fee-other", "image/png", "student-1"),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(lifecycle.assertCanSubmitReceipt).toHaveBeenCalledWith(
      "org-1",
      "fee-other",
      "student-1",
    );
    expect(r2.generatePresignedUrl).not.toHaveBeenCalled();
  });

  it("returns a signature and expiry when generating a receipt upload URL", async () => {
    lifecycle.assertCanSubmitReceipt.mockResolvedValue(undefined);
    r2.generatePresignedUrl.mockResolvedValue("https://upload.example/receipt");

    await expect(
      service.generateUploadUrl("org-1", "fee-1", "image/png", "student-1"),
    ).resolves.toMatchObject({
      uploadUrl: "https://upload.example/receipt",
      fileKeySignature: expect.any(String),
      expiresAt: expect.any(String),
    });
  });

  it("rejects receipt confirmation when the file key differs from the signed key", async () => {
    const issued = await service.generateUploadUrl("org-1", "fee-1", "image/png", "student-1");

    await expect(
      service.confirmReceipt(
        "org-1",
        "fee-1",
        "user-1",
        {
          fileKey: "receipts/org-1/fee-1/forged-key",
          fileKeySignature: issued.fileKeySignature,
          fileType: "image/png",
          fileSizeBytes: 100,
          note: "",
        },
        "student-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(lifecycle.submitReceipt).not.toHaveBeenCalled();
  });

  it("rejects receipt confirmation when a valid signature is replayed for another fee context", async () => {
    const signature = issueUploadKeySignature({
      purpose: "receipt",
      organizationId: "org-1",
      subjectId: "fee-1",
      fileKey: "receipts/org-1/fee-2/file.png",
      studentId: "student-1",
    });

    await expect(
      service.confirmReceipt(
        "org-1",
        "fee-2",
        "user-1",
        {
          fileKey: "receipts/org-1/fee-2/file.png",
          fileKeySignature: signature.fileKeySignature,
          fileType: "image/png",
          fileSizeBytes: 100,
          note: "",
        },
        "student-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(lifecycle.submitReceipt).not.toHaveBeenCalled();
  });

  it("rejects receipt confirmation when a valid signature is replayed for another student context", async () => {
    const signature = issueUploadKeySignature({
      purpose: "receipt",
      organizationId: "org-1",
      subjectId: "fee-1",
      fileKey: "receipts/org-1/fee-1/file.png",
      studentId: "student-1",
    });

    await expect(
      service.confirmReceipt(
        "org-1",
        "fee-1",
        "user-1",
        {
          fileKey: "receipts/org-1/fee-1/file.png",
          fileKeySignature: signature.fileKeySignature,
          fileType: "image/png",
          fileSizeBytes: 100,
          note: "",
        },
        "student-2",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(lifecycle.submitReceipt).not.toHaveBeenCalled();
  });

  it("preserves existing instructor receipt signed URL behavior for in-scope receipts", async () => {
    academiaScope.assertMonthlyFeeBelongsToAcademia.mockResolvedValue({ id: "fee-1" });
    academiaScope.assertPixReceiptBelongsToAcademia.mockResolvedValue({
      id: "receipt-1",
      monthlyFeeId: "fee-1",
      organizationId: "org-1",
      studentId: "student-1",
      fileKey: "receipts/org-1/fee-1/file.png",
    });
    r2.generateReadUrl.mockResolvedValue("https://signed.example/file.png");

    await expect(service.receiptViewUrl("org-1", "fee-1", "receipt-1")).resolves.toMatchObject({
      viewUrl: "https://signed.example/file.png",
    });

    expect(r2.generateReadUrl).toHaveBeenCalledWith("receipts/org-1/fee-1/file.png", 5 * 60);
  });
});
