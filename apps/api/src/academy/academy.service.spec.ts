import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcademyService, buildAcademyOnboardingChecklist } from "./academy.service";

const academyRow = {
  id: "org-1",
  name: "Tatame Centro",
  slug: "tatame-centro",
  logo: null,
  address: null,
  phone: null,
  instagram: null,
  pixKeyType: null,
  pixKey: null,
  pixCopyPaste: null,
};

function createDbMock() {
  const updated: Array<Record<string, unknown>> = [];
  return {
    updated,
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([academyRow]) })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn((value: Record<string, unknown>) => {
          updated.push(value);
          return { where: vi.fn().mockResolvedValue(undefined) };
        }),
      })),
    },
  };
}

describe("buildAcademyOnboardingChecklist", () => {
  it("marks first access link as sent when any pre-registration has a token hash", () => {
    expect(
      buildAcademyOnboardingChecklist({
        classGroupCount: 1,
        sharedLinkCount: 1,
        approvedPreRegistrationCount: 1,
        firstAccessLinkSentCount: 1,
        pendingPreRegistrationCount: 0,
        firstAccessStudentId: "student-1",
      }),
    ).toMatchObject({
      steps: { firstAccessLinkSent: true, firstPreRegistrationApproved: true },
      firstAccessStudentId: "student-1",
    });
  });

  it("keeps first access link unsent without a token hash", () => {
    expect(
      buildAcademyOnboardingChecklist({
        classGroupCount: 1,
        sharedLinkCount: 1,
        approvedPreRegistrationCount: 1,
        firstAccessLinkSentCount: 0,
        pendingPreRegistrationCount: 0,
        firstAccessStudentId: "student-1",
      }).steps.firstAccessLinkSent,
    ).toBe(false);
  });
});

describe("AcademyService logo uploads", () => {
  const r2 = {
    generatePresignedUrl: vi.fn(),
    getPublicUrl: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    r2.generatePresignedUrl = vi.fn().mockResolvedValue("https://upload.example/logo");
    r2.getPublicUrl = vi.fn((fileKey: string) => `https://cdn.example/${fileKey}`);
  });

  it("returns a signature and expiry when generating a logo upload URL", async () => {
    const { db } = createDbMock();
    const service = new AcademyService(db as never, r2 as never);

    await expect(service.generateLogoUploadUrl("org-1")).resolves.toMatchObject({
      uploadUrl: "https://upload.example/logo",
      fileKey: expect.stringMatching(/^logos\/org-1\//),
      fileKeySignature: expect.any(String),
      expiresAt: expect.any(String),
    });
  });

  it("rejects confirming a logo with a different file key than the issued one", async () => {
    const { db, updated } = createDbMock();
    const service = new AcademyService(db as never, r2 as never);
    const issued = await service.generateLogoUploadUrl("org-1");

    await expect(
      service.confirmLogo("org-1", "logos/org-1/forged-key", issued.fileKeySignature),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(updated).toHaveLength(0);
  });

  it("rejects confirming a logo outside the organization prefix", async () => {
    const { db, updated } = createDbMock();
    const service = new AcademyService(db as never, r2 as never);
    const issued = await service.generateLogoUploadUrl("org-1");

    await expect(
      service.confirmLogo("org-1", "logos/org-2/logo.png", issued.fileKeySignature),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(updated).toHaveLength(0);
  });
});
