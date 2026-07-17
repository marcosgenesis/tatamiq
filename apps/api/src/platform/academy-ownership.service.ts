import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { type Database, member, organization } from "@tatamiq/database";
import { and, count, eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { ReservedAccountService } from "./reserved-account.service";

export type AssignAcademyOwnerInput = {
  ownerEmail: string;
  ownerName?: string;
};

export type RemoveAcademyResponsibleInput = {
  userId: string;
  allowLeavingOwnerless?: boolean;
};

export type AcademyOwnerAssignment = {
  ownerUserId: string;
  ownerWasCreated: boolean;
  firstAccessLink: string | null;
};

export type OwnedAcademyImpact = {
  id: string;
  name: string;
  slug: string;
  isOnlyOwner: boolean;
};

@Injectable()
export class AcademyOwnershipService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(ReservedAccountService) private readonly reservedAccounts: ReservedAccountService,
  ) {}

  async assignInitialOwnerByEmail(
    academyId: string,
    input: AssignAcademyOwnerInput,
  ): Promise<AcademyOwnerAssignment> {
    return this.assignOwnerByEmail(academyId, input);
  }

  async addResponsibleByEmail(
    academyId: string,
    input: AssignAcademyOwnerInput,
  ): Promise<AcademyOwnerAssignment> {
    return this.assignOwnerByEmail(academyId, input);
  }

  async removeResponsible(academyId: string, input: RemoveAcademyResponsibleInput) {
    await this.assertAcademyExists(academyId);
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(member)
      .where(and(eq(member.organizationId, academyId), eq(member.role, "owner")));
    const totalOwners = total ?? 0;
    if (totalOwners <= 1 && !input.allowLeavingOwnerless) {
      throw new BadRequestException(
        "A academia precisa de confirmação para ficar sem responsável.",
      );
    }
    await this.db
      .delete(member)
      .where(
        and(
          eq(member.organizationId, academyId),
          eq(member.userId, input.userId),
          eq(member.role, "owner"),
        ),
      );
  }

  async keepOwnerless(academyId: string, ownerUserId: string) {
    await this.db
      .delete(member)
      .where(
        and(
          eq(member.organizationId, academyId),
          eq(member.userId, ownerUserId),
          eq(member.role, "owner"),
        ),
      );
  }

  async ownedAcademyImpactForUser(userId: string): Promise<OwnedAcademyImpact[]> {
    const ownedMemberships = await this.db
      .select({ member, organization })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(and(eq(member.userId, userId), eq(member.role, "owner")));

    const ownerCounts = await Promise.all(
      ownedMemberships.map(async (item) => {
        const [{ total }] = await this.db
          .select({ total: count() })
          .from(member)
          .where(and(eq(member.organizationId, item.organization.id), eq(member.role, "owner")));
        return { organizationId: item.organization.id, total: total ?? 0 };
      }),
    );

    return ownedMemberships.map((item) => ({
      id: item.organization.id,
      name: item.organization.name,
      slug: item.organization.slug,
      isOnlyOwner:
        (ownerCounts.find((countRow) => countRow.organizationId === item.organization.id)?.total ??
          0) <= 1,
    }));
  }

  private async assignOwnerByEmail(
    academyId: string,
    input: AssignAcademyOwnerInput,
  ): Promise<AcademyOwnerAssignment> {
    await this.assertAcademyExists(academyId);

    const ownerEmail = input.ownerEmail.trim().toLowerCase();
    const ownerName = input.ownerName?.trim() || ownerEmail;
    const reserved = await this.reservedAccounts.createOrReuse(ownerEmail, ownerName);
    const now = new Date();

    await this.db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: academyId,
      userId: reserved.user.id,
      role: "owner",
      createdAt: now,
    });

    return {
      ownerUserId: reserved.user.id,
      ownerWasCreated: reserved.isNew,
      firstAccessLink: reserved.firstAccessLink
        ? this.reservedAccounts.firstAccessUrl(reserved.firstAccessLink)
        : null,
    };
  }

  private async assertAcademyExists(academyId: string) {
    const [academy] = await this.db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, academyId))
      .limit(1);

    if (!academy) throw new NotFoundException("Academia não encontrada.");
  }
}
