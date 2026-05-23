import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AcademyLogoUploadResponse,
  AcademyProfile,
  UpdateAcademyInput,
} from "@tatamiq/contracts";
import { type Database, organization } from "@tatamiq/database";
import { eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { R2StorageService } from "../monthly-fees/r2-storage.service";

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

  async generateLogoUploadUrl(organizationId: string): Promise<AcademyLogoUploadResponse> {
    await this.get(organizationId);

    const fileKey = `logos/${organizationId}/${crypto.randomUUID()}`;
    const uploadUrl = await this.r2.generatePresignedUrl(fileKey, "image/*");
    return { uploadUrl, fileKey };
  }

  async confirmLogo(organizationId: string, fileKey: string): Promise<AcademyProfile> {
    await this.get(organizationId);

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
