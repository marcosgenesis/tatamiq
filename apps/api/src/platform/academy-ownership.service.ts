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
  ownerlessConfirmation?: string;
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

export const OWNERLESS_CONFIRMATION_TEXT = "SEM RESPONSÁVEL";

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
    return this.assignOwnerByEmail(academyId, input, { replaceExistingOwners: false });
  }

  async transferOwnerByEmail(
    academyId: string,
    input: AssignAcademyOwnerInput,
  ): Promise<AcademyOwnerAssignment> {
    return this.assignOwnerByEmail(academyId, input, { replaceExistingOwners: true });
  }

  async addResponsibleByEmail(
    academyId: string,
    input: AssignAcademyOwnerInput,
  ): Promise<AcademyOwnerAssignment> {
    return this.assignOwnerByEmail(academyId, input, { replaceExistingOwners: false });
  }

  async removeResponsible(academyId: string, input: RemoveAcademyResponsibleInput) {
    await this.assertAcademyExists(academyId);

    const [targetResponsible] = await this.db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.organizationId, academyId),
          eq(member.userId, input.userId),
          eq(member.role, "owner"),
        ),
      )
      .limit(1);

    if (!targetResponsible) {
      throw new NotFoundException("Responsável da academia não encontrado.");
    }

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(member)
      .where(and(eq(member.organizationId, academyId), eq(member.role, "owner")))
      .limit(1);
    const totalOwners = total ?? 0;
    const leavesOwnerless = totalOwners <= 1;
    if (leavesOwnerless) {
      const confirmed =
        input.allowLeavingOwnerless === true &&
        input.ownerlessConfirmation?.trim().toUpperCase() === OWNERLESS_CONFIRMATION_TEXT;
      if (!confirmed) {
        throw new BadRequestException(
          `Digite ${OWNERLESS_CONFIRMATION_TEXT} para deixar a academia sem responsável.`,
        );
      }
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
    return { leftOwnerless: leavesOwnerless };
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
    options: { replaceExistingOwners: boolean },
  ): Promise<AcademyOwnerAssignment> {
    await this.assertAcademyExists(academyId);

    const ownerEmail = input.ownerEmail.trim().toLowerCase();
    const ownerName = input.ownerName?.trim() || ownerEmail;
    const reserved = await this.reservedAccounts.createOrReuse(ownerEmail, ownerName);
    const now = new Date();

    if (options.replaceExistingOwners) {
      await this.db
        .delete(member)
        .where(and(eq(member.organizationId, academyId), eq(member.role, "owner")));
    }

    const [existingMembership] = await this.db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.organizationId, academyId),
          eq(member.userId, reserved.user.id),
          eq(member.role, "owner"),
        ),
      )
      .limit(1);

    if (!existingMembership) {
      await this.db.insert(member).values({
        id: crypto.randomUUID(),
        organizationId: academyId,
        userId: reserved.user.id,
        role: "owner",
        createdAt: now,
      });
    }

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
