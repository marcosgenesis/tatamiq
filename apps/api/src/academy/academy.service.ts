import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AcademyLogoUploadResponse,
  AcademyOnboardingChecklist,
  AcademyProfile,
  UpdateAcademyInput,
} from "@tatamiq/contracts";
import {
  academyPreRegistrationLinks,
  classGroups,
  type Database,
  organization,
  preRegistrationRequests,
} from "@tatamiq/database";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { R2StorageService } from "../monthly-fees/r2-storage.service";
import {
  assertValidUploadKeySignature,
  issueUploadKeySignature,
} from "../monthly-fees/upload-key-signature";

@Injectable()
export class AcademyService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(R2StorageService) private readonly r2: R2StorageService,
  ) {}

  async get(organizationId: string): Promise<AcademyProfile> {
    const [row] = await this.db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!row) {
      throw new NotFoundException("Academia não encontrada.");
    }

    return toProfile(row);
  }

  async update(organizationId: string, input: UpdateAcademyInput): Promise<AcademyProfile> {
    const row = await this.get(organizationId);
    if (!row) {
      throw new NotFoundException("Academia não encontrada.");
    }

    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.address !== undefined) updates.address = input.address || null;
    if (input.phone !== undefined) updates.phone = input.phone || null;
    if (input.instagram !== undefined) updates.instagram = input.instagram || null;
    if (input.pixKeyType !== undefined) updates.pixKeyType = input.pixKeyType;
    if (input.pixKey !== undefined) updates.pixKey = input.pixKey || null;
    if (input.pixCopyPaste !== undefined) updates.pixCopyPaste = input.pixCopyPaste || null;

    if (Object.keys(updates).length > 0) {
      await this.db.update(organization).set(updates).where(eq(organization.id, organizationId));
    }

    return this.get(organizationId);
  }

  async getOnboardingChecklist(organizationId: string): Promise<AcademyOnboardingChecklist> {
    const [academy] = await this.db
      .select({ onboardingChecklistDismissedAt: organization.onboardingChecklistDismissedAt })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!academy) {
      throw new NotFoundException("Academia não encontrada.");
    }

    const [classGroupCount] = await this.db
      .select({ total: count() })
      .from(classGroups)
      .where(eq(classGroups.organizationId, organizationId));
    const [pendingPreRegistrationCount] = await this.db
      .select({ total: count() })
      .from(preRegistrationRequests)
      .where(
        and(
          eq(preRegistrationRequests.organizationId, organizationId),
          eq(preRegistrationRequests.status, "pending_review"),
        ),
      );
    const [approvedPreRegistrationCount] = await this.db
      .select({ total: count() })
      .from(preRegistrationRequests)
      .where(
        and(
          eq(preRegistrationRequests.organizationId, organizationId),
          eq(preRegistrationRequests.status, "approved"),
        ),
      );
    const [firstAccessLinkSentCount] = await this.db
      .select({ total: count() })
      .from(preRegistrationRequests)
      .where(
        and(
          eq(preRegistrationRequests.organizationId, organizationId),
          isNotNull(preRegistrationRequests.firstAccessTokenHash),
        ),
      );
    const [firstAccessStudent] = await this.db
      .select({ studentId: preRegistrationRequests.approvedStudentId })
      .from(preRegistrationRequests)
      .where(
        and(
          eq(preRegistrationRequests.organizationId, organizationId),
          eq(preRegistrationRequests.status, "approved"),
          isNotNull(preRegistrationRequests.approvedStudentId),
        ),
      )
      .orderBy(desc(preRegistrationRequests.reviewedAt), desc(preRegistrationRequests.createdAt))
      .limit(1);
    const [sharedLinkCount] = await this.db
      .select({ total: count() })
      .from(academyPreRegistrationLinks)
      .where(eq(academyPreRegistrationLinks.organizationId, organizationId));

    return buildAcademyOnboardingChecklist({
      classGroupCount: Number(classGroupCount?.total ?? 0),
      sharedLinkCount: Number(sharedLinkCount?.total ?? 0),
      approvedPreRegistrationCount: Number(approvedPreRegistrationCount?.total ?? 0),
      firstAccessLinkSentCount: Number(firstAccessLinkSentCount?.total ?? 0),
      pendingPreRegistrationCount: Number(pendingPreRegistrationCount?.total ?? 0),
      firstAccessStudentId: firstAccessStudent?.studentId ?? null,
      dismissed: academy.onboardingChecklistDismissedAt !== null,
    });
  }

  async dismissOnboardingChecklist(organizationId: string): Promise<AcademyOnboardingChecklist> {
    await this.get(organizationId);
    await this.db
      .update(organization)
      .set({ onboardingChecklistDismissedAt: new Date() })
      .where(eq(organization.id, organizationId));
    return this.getOnboardingChecklist(organizationId);
  }

  async generateLogoUploadUrl(organizationId: string): Promise<AcademyLogoUploadResponse> {
    await this.get(organizationId);

    const fileKey = `logos/${organizationId}/${crypto.randomUUID()}`;
    const uploadUrl = await this.r2.generatePresignedUrl(fileKey, "image/*");
    const signature = issueUploadKeySignature({
      purpose: "academy-logo",
      organizationId,
      subjectId: organizationId,
      fileKey,
    });
    return { uploadUrl, fileKey, ...signature };
  }

  async confirmLogo(
    organizationId: string,
    fileKey: string,
    fileKeySignature: string,
  ): Promise<AcademyProfile> {
    await this.get(organizationId);

    if (!fileKey.startsWith(`logos/${organizationId}/`)) {
      throw new BadRequestException("Upload inválido ou expirado.");
    }

    assertValidUploadKeySignature(
      {
        purpose: "academy-logo",
        organizationId,
        subjectId: organizationId,
        fileKey,
      },
      fileKeySignature,
    );

    const logoUrl = this.r2.getPublicUrl(fileKey);
    await this.db
      .update(organization)
      .set({ logo: logoUrl })
      .where(eq(organization.id, organizationId));

    return this.get(organizationId);
  }
}

type OrganizationRow = typeof organization.$inferSelect;

function toProfile(row: OrganizationRow): AcademyProfile {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo,
    address: row.address,
    phone: row.phone,
    instagram: row.instagram,
    pixKeyType: parsePixKeyType(row.pixKeyType),
    pixKey: row.pixKey,
    pixCopyPaste: row.pixCopyPaste,
  };
}

export function buildAcademyOnboardingChecklist(input: {
  classGroupCount: number;
  sharedLinkCount: number;
  approvedPreRegistrationCount: number;
  firstAccessLinkSentCount: number;
  pendingPreRegistrationCount: number;
  firstAccessStudentId: string | null;
  dismissed?: boolean;
}): AcademyOnboardingChecklist {
  return {
    steps: {
      turmaCreated: input.classGroupCount > 0,
      preRegistrationLinkShared: input.sharedLinkCount > 0,
      firstPreRegistrationApproved: input.approvedPreRegistrationCount > 0,
      firstAccessLinkSent: input.firstAccessLinkSentCount > 0,
    },
    pendingPreRegistrationCount: input.pendingPreRegistrationCount,
    firstAccessStudentId: input.firstAccessStudentId,
    dismissed: input.dismissed ?? false,
  };
}

function parsePixKeyType(value: string | null): AcademyProfile["pixKeyType"] {
  if (value === null) return null;
  const valid = ["cpf", "email", "phone", "random"];
  if (valid.includes(value)) return value as AcademyProfile["pixKeyType"];
  return null;
}
