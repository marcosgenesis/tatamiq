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
import { eq, isNotNull, sql } from "drizzle-orm";
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

  async getOnboardingChecklist(organizationId: string): Promise<AcademyOnboardingChecklist> {
    const academy = await this.findOrganizationOrThrow(organizationId);

    const [
      classGroupSummary,
      preRegistrationLinkSummary,
      approvedRequestSummary,
      firstAccessRequest,
      pendingRequestSummary,
    ] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(classGroups)
        .where(eq(classGroups.organizationId, organizationId))
        .limit(1),
      this.db
        .select({ copiedAt: academyPreRegistrationLinks.copiedAt })
        .from(academyPreRegistrationLinks)
        .where(eq(academyPreRegistrationLinks.organizationId, organizationId))
        .limit(1),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(preRegistrationRequests)
        .where(
          sql`${preRegistrationRequests.organizationId} = ${organizationId} and ${preRegistrationRequests.status} = 'approved'`,
        )
        .limit(1),
      this.db
        .select({
          approvedStudentId: preRegistrationRequests.approvedStudentId,
          firstAccessTokenHash: preRegistrationRequests.firstAccessTokenHash,
        })
        .from(preRegistrationRequests)
        .where(
          sql`${preRegistrationRequests.organizationId} = ${organizationId} and ${preRegistrationRequests.approvedStudentId} is not null`,
        )
        .limit(1),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(preRegistrationRequests)
        .where(
          sql`${preRegistrationRequests.organizationId} = ${organizationId} and ${preRegistrationRequests.status} = 'pending_review'`,
        )
        .limit(1),
    ]);

    const turmaCreated = Number(classGroupSummary[0]?.count ?? 0) > 0;
    const preRegistrationLinkShared = preRegistrationLinkSummary[0]?.copiedAt !== null;
    const firstPreRegistrationApproved = Number(approvedRequestSummary[0]?.count ?? 0) > 0;
    const firstAccessLinkSent = firstAccessRequest[0]?.firstAccessTokenHash !== null;

    return {
      steps: {
        turmaCreated,
        preRegistrationLinkShared,
        firstPreRegistrationApproved,
        firstAccessLinkSent,
      },
      pendingPreRegistrationCount: Number(pendingRequestSummary[0]?.count ?? 0),
      firstAccessStudentId: firstAccessRequest[0]?.approvedStudentId ?? null,
      dismissed: academy.onboardingChecklistDismissedAt !== null,
    };
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

  async dismissOnboardingChecklist(organizationId: string): Promise<AcademyOnboardingChecklist> {
    await this.findOrganizationOrThrow(organizationId);

    await this.db
      .update(organization)
      .set({ onboardingChecklistDismissedAt: new Date() })
      .where(eq(organization.id, organizationId));

    return this.getOnboardingChecklist(organizationId);
  }

  private async findOrganizationOrThrow(organizationId: string): Promise<OrganizationRow> {
    const [row] = await this.db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!row) {
      throw new NotFoundException("Academia não encontrada.");
    }

    return row;
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

function parsePixKeyType(value: string | null): AcademyProfile["pixKeyType"] {
  if (value === null) return null;
  const valid = ["cpf", "email", "phone", "random"];
  if (valid.includes(value)) return value as AcademyProfile["pixKeyType"];
  return null;
}
