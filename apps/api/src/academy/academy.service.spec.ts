import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcademyService } from "./academy.service";

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
  onboardingChecklistDismissedAt: null,
};

function createDbMock(selectResults: unknown[] = [[academyRow]]) {
  const updated: Array<Record<string, unknown>> = [];
  let selectIndex = 0;
  return {
    updated,
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockImplementation(async () => {
              const fallback = [academyRow];
              const result = selectResults[selectIndex];
              selectIndex += 1;
              return result ?? fallback;
            }),
          })),
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

function checklistSelectResults(input?: {
  dismissedAt?: Date | null;
  classGroupCount?: number;
  copiedAt?: Date | null;
  approvedCount?: number;
  firstAccessStudentId?: string | null;
  firstAccessTokenHash?: string | null;
  pendingCount?: number;
}) {
  return [
    [{ ...academyRow, onboardingChecklistDismissedAt: input?.dismissedAt ?? null }],
    [{ count: input?.classGroupCount ?? 0 }],
    [{ copiedAt: input?.copiedAt ?? null }],
    [{ count: input?.approvedCount ?? 0 }],
    [
      {
        approvedStudentId: input?.firstAccessStudentId ?? null,
        firstAccessTokenHash: input?.firstAccessTokenHash ?? null,
      },
    ],
    [{ count: input?.pendingCount ?? 0 }],
  ];
}

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

describe("AcademyService onboarding checklist", () => {
  const r2 = {
    generatePresignedUrl: vi.fn(),
    getPublicUrl: vi.fn(),
  };

  it("returns all checklist steps as false for a new academy", async () => {
    const { db } = createDbMock(checklistSelectResults());
    const service = new AcademyService(db as never, r2 as never);

    await expect(service.getOnboardingChecklist("org-1")).resolves.toEqual({
      steps: {
        turmaCreated: false,
        preRegistrationLinkShared: false,
        firstPreRegistrationApproved: false,
        firstAccessLinkSent: false,
      },
      pendingPreRegistrationCount: 0,
      firstAccessStudentId: null,
      dismissed: false,
    });
  });

  it("marks the class-group step as complete when the academy has at least one turma", async () => {
    const { db } = createDbMock(checklistSelectResults({ classGroupCount: 1 }));
    const service = new AcademyService(db as never, r2 as never);

    await expect(service.getOnboardingChecklist("org-1")).resolves.toMatchObject({
      steps: { turmaCreated: true },
    });
  });

  it("marks the pre-registration link step as complete when the link has been copied", async () => {
    const { db } = createDbMock(
      checklistSelectResults({ copiedAt: new Date("2026-07-17T10:00:00.000Z") }),
    );
    const service = new AcademyService(db as never, r2 as never);

    await expect(service.getOnboardingChecklist("org-1")).resolves.toMatchObject({
      steps: { preRegistrationLinkShared: true },
    });
  });

  it("marks the pre-registration approval step as complete when an approved request exists", async () => {
    const { db } = createDbMock(checklistSelectResults({ approvedCount: 1 }));
    const service = new AcademyService(db as never, r2 as never);

    await expect(service.getOnboardingChecklist("org-1")).resolves.toMatchObject({
      steps: { firstPreRegistrationApproved: true },
    });
  });

  it("marks the first-access step as complete when a first-access token has already been issued", async () => {
    const { db } = createDbMock(
      checklistSelectResults({
        approvedCount: 1,
        firstAccessStudentId: "student-1",
        firstAccessTokenHash: "hashed-token",
      }),
    );
    const service = new AcademyService(db as never, r2 as never);

    await expect(service.getOnboardingChecklist("org-1")).resolves.toMatchObject({
      steps: { firstAccessLinkSent: true },
      firstAccessStudentId: "student-1",
    });
  });

  it("persists dismissal and returns the updated checklist", async () => {
    const dismissedAt = new Date("2026-07-17T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(dismissedAt);

    const { db, updated } = createDbMock([
      [{ ...academyRow, onboardingChecklistDismissedAt: null }],
      ...checklistSelectResults({ dismissedAt }),
    ]);
    const service = new AcademyService(db as never, r2 as never);

    await expect(service.dismissOnboardingChecklist("org-1")).resolves.toMatchObject({
      dismissed: true,
    });

    expect(updated).toContainEqual({ onboardingChecklistDismissedAt: dismissedAt });
    vi.useRealTimers();
  });
});
