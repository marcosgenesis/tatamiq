import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  account,
  type Database,
  member,
  organization,
  session,
  studentAccess,
  user,
} from "@tatamiq/database";
import { count, eq } from "drizzle-orm";
import { platformAdminUserIds } from "../auth";
import { DATABASE } from "../database/database.module";
import { AcademyOwnershipService } from "./academy-ownership.service";
import { PlatformAdminService } from "./platform-admin.service";

export type UserDeletionImpact = {
  userId: string;
  memberships: number;
  ownedAcademies: Array<{ id: string; name: string; slug: string; isOnlyOwner: boolean }>;
  studentAccessLinks: number;
  activeSessions: number;
  isPlatformAdmin: boolean;
};

export type DeleteUserInput = {
  mode: "definitive" | "preserve_history";
  ownerResolution?: "keep_ownerless";
  confirmLeaveOwnerless?: boolean;
};

@Injectable()
export class UserDeletionService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(AcademyOwnershipService)
    private readonly academyOwnership: AcademyOwnershipService,
    @Inject(PlatformAdminService) private readonly platformAdmins: PlatformAdminService,
  ) {}

  async impact(id: string): Promise<UserDeletionImpact> {
    const [row] = await this.db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!row) throw new NotFoundException("Usuário não encontrado.");

    const [memberships, ownedAcademies, studentAccessRows, [{ activeSessions }]] =
      await Promise.all([
        this.db
          .select({ member, organization })
          .from(member)
          .innerJoin(organization, eq(member.organizationId, organization.id))
          .where(eq(member.userId, id)),
        this.academyOwnership.ownedAcademyImpactForUser(id),
        this.db
          .select({ id: studentAccess.id })
          .from(studentAccess)
          .where(eq(studentAccess.authUserId, id)),
        this.db.select({ activeSessions: count() }).from(session).where(eq(session.userId, id)),
      ]);

    return {
      userId: id,
      memberships: memberships.length,
      ownedAcademies,
      studentAccessLinks: studentAccessRows.length,
      activeSessions: activeSessions ?? 0,
      isPlatformAdmin: row.role === "admin" || platformAdminUserIds().includes(row.id),
    };
  }

  async delete(id: string, input: DeleteUserInput) {
    await this.platformAdmins.assertCanDisablePlatformUser(id);
    const impact = await this.impact(id);
    const onlyOwnerAcademies = impact.ownedAcademies.filter((academy) => academy.isOnlyOwner);

    if (onlyOwnerAcademies.length > 0) {
      await this.resolveOnlyResponsibleAcademies(id, onlyOwnerAcademies, input);
    }

    await this.academyOwnership.removeResponsibleLinksForUser(id);
    await this.db.delete(session).where(eq(session.userId, id));

    if (input.mode === "definitive") {
      await this.db.delete(user).where(eq(user.id, id));
      return { success: true };
    }

    await this.db.delete(account).where(eq(account.userId, id));
    await this.db
      .update(user)
      .set({
        name: "Usuário excluído",
        email: `deleted+${id}@tatamiq.local`,
        image: null,
        role: null,
        banned: true,
        banReason: "deleted_preserving_history",
        updatedAt: new Date(),
      })
      .where(eq(user.id, id));

    return { success: true };
  }

  private async resolveOnlyResponsibleAcademies(
    userId: string,
    academies: Array<{ id: string }>,
    input: DeleteUserInput,
  ) {
    if (input.ownerResolution !== "keep_ownerless") {
      throw new BadRequestException(
        "Decida explicitamente se a academia ficará sem responsável antes de excluir.",
      );
    }

    if (!input.confirmLeaveOwnerless) {
      throw new BadRequestException("Confirme para deixar a academia sem responsável.");
    }

    await Promise.all(
      academies.map((academy) => this.academyOwnership.keepOwnerless(academy.id, userId)),
    );
  }
}
