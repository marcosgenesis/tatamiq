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
import { and, count, eq, isNotNull } from "drizzle-orm";
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
    const row = await this.getOrganization(organizationId);
    return toProfile(row);
  }

  async onboardingChecklist(organizationId: string): Promise<AcademyOnboardingChecklist> {
    const academy = await this.getOrganization(organizationId);
    const [turmas] = await this.db
      .select({ total: count() })
      .from(classGroups)
      .where(eq(classGroups.organizationId, organizationId));
    const [sharedLinks] = await this.db
      .select({ total: count() })
      .from(academyPreRegistrationLinks)
      .where(
        and(
          eq(academyPreRegistrationLinks.organizationId, organizationId),
          isNotNull(academyPreRegistrationLinks.copiedAt),
        ),
      );
    const [approvedRequests] = await this.db
      .select({ total: count() })
      .from(preRegistrationRequests)
      .where(
        and(
          eq(preRegistrationRequests.organizationId, organizationId),
          eq(preRegistrationRequests.status, "approved"),
        ),
      );
    const [firstAccessLinks] = await this.db
      .select({ total: count() })
      .from(preRegistrationRequests)
      .where(
        and(
          eq(preRegistrationRequests.organizationId, organizationId),
          isNotNull(preRegistrationRequests.firstAccessTokenHash),
        ),
      );
    const [pendingRequests] = await this.db
      .select({ total: count() })
      .from(preRegistrationRequests)
      .where(
        and(
          eq(preRegistrationRequests.organizationId, organizationId),
          eq(preRegistrationRequests.status, "pending_review"),
        ),
      );
    const [firstAccessStudent] = await this.db
      .select({ studentId: preRegistrationRequests.approvedStudentId })
      .from(preRegistrationRequests)
      .where(
        and(
          eq(preRegistrationRequests.organizationId, organizationId),
          isNotNull(preRegistrationRequests.firstAccessTokenHash),
        ),
      )
      .limit(1);

    return {
      steps: {
        turmaCreated: (turmas?.total ?? 0) > 0,
        preRegistrationLinkShared: (sharedLinks?.total ?? 0) > 0,
        firstPreRegistrationApproved: (approvedRequests?.total ?? 0) > 0,
        firstAccessLinkSent: (firstAccessLinks?.total ?? 0) > 0,
      },
      pendingPreRegistrationCount: pendingRequests?.total ?? 0,
      firstAccessStudentId: firstAccessStudent?.studentId ?? null,
      dismissed: academy.onboardingChecklistDismissedAt !== null,
    };
  }

  async dismissOnboardingChecklist(organizationId: string): Promise<AcademyOnboardingChecklist> {
    await this.db
      .update(organization)
      .set({ onboardingChecklistDismissedAt: new Date() })
      .where(eq(organization.id, organizationId));
    return this.onboardingChecklist(organizationId);
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

  private async getOrganization(organizationId: string): Promise<OrganizationRow> {
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

function parsePixKeyType(value: string | null): AcademyProfile["pixKeyType"] {
  if (value === null) return null;
  const valid = ["cpf", "email", "phone", "random"];
  if (valid.includes(value)) return value as AcademyProfile["pixKeyType"];
  return null;
}
