import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  account,
  type Database,
  member,
  organization,
  session,
  studentAccess,
  students,
  user,
} from "@tatamiq/database";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { platformAdminUserIds } from "../auth";
import { DATABASE } from "../database/database.module";
import { PlatformAcademyService } from "./platform-academy.service";

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
  ownerResolution?: "keep_ownerless" | "transfer";
  transferOwnerEmail?: string;
  transferOwnerName?: string;
};

@Injectable()
export class PlatformUserService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(PlatformAcademyService) private readonly platformAcademies: PlatformAcademyService,
  ) {}

  async listUsers(options: { query?: string; page?: number; pageSize?: number } = {}) {
    const page = Math.max(0, options.page ?? 0);
    const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));
    const query = options.query?.trim();
    const where = query
      ? or(ilike(user.email, `%${query}%`), ilike(user.name, `%${query}%`))
      : undefined;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(user)
        .where(where)
        .orderBy(desc(user.createdAt))
        .limit(pageSize)
        .offset(page * pageSize),
      this.db.select({ total: count() }).from(user).where(where),
    ]);

    return {
      items: rows.map((row) => toUserSummary(row)),
      pagination: {
        page,
        pageSize,
        total: total ?? 0,
        totalPages: Math.ceil((total ?? 0) / pageSize),
      },
    };
  }

  async getUser(id: string) {
    const [row] = await this.db.select().from(user).where(eq(user.id, id)).limit(1);

    if (!row) {
      throw new NotFoundException("Usuário não encontrado.");
    }

    const [memberships, studentAccessLinks, [{ activeSessions }]] = await Promise.all([
      this.db
        .select({ member, organization })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(eq(member.userId, id)),
      this.db
        .select({ studentAccess, student: students, organization })
        .from(studentAccess)
        .innerJoin(students, eq(studentAccess.studentId, students.id))
        .innerJoin(organization, eq(studentAccess.organizationId, organization.id))
        .where(eq(studentAccess.authUserId, id)),
      this.db.select({ activeSessions: count() }).from(session).where(eq(session.userId, id)),
    ]);

    return {
      ...toUserSummary(row),
      emailVerified: row.emailVerified,
      memberships: memberships.map((m) => ({
        memberId: m.member.id,
        organizationId: m.organization.id,
        organizationName: m.organization.name,
        organizationSlug: m.organization.slug,
        role: m.member.role,
        createdAt: m.member.createdAt.toISOString(),
      })),
      studentAccessLinks: studentAccessLinks.map((sa) => ({
        id: sa.studentAccess.id,
        studentId: sa.student.id,
        studentName: sa.student.name,
        organizationId: sa.organization.id,
        organizationName: sa.organization.name,
        status: sa.studentAccess.status,
        createdAt: sa.studentAccess.createdAt.toISOString(),
      })),
      activeSessions: activeSessions ?? 0,
    };
  }

  async banUser(id: string, reason?: string) {
    const [row] = await this.db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!row) throw new NotFoundException("Usuário não encontrado.");

    await this.db
      .update(user)
      .set({ banned: true, banReason: reason ?? null })
      .where(eq(user.id, id));

    await this.db.delete(session).where(eq(session.userId, id));

    return { success: true };
  }

  async unbanUser(id: string) {
    const [row] = await this.db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!row) throw new NotFoundException("Usuário não encontrado.");

    await this.db.update(user).set({ banned: false, banReason: null }).where(eq(user.id, id));

    return { success: true };
  }

  async revokeUserSessions(id: string) {
    const [row] = await this.db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!row) throw new NotFoundException("Usuário não encontrado.");

    await this.db.delete(session).where(eq(session.userId, id));

    return { success: true };
  }

  async userDeletionImpact(id: string): Promise<UserDeletionImpact> {
    const [row] = await this.db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!row) throw new NotFoundException("Usuário não encontrado.");

    const [memberships, studentAccessRows, [{ activeSessions }]] = await Promise.all([
      this.db
        .select({ member, organization })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(eq(member.userId, id)),
      this.db
        .select({ id: studentAccess.id })
        .from(studentAccess)
        .where(eq(studentAccess.authUserId, id)),
      this.db.select({ activeSessions: count() }).from(session).where(eq(session.userId, id)),
    ]);

    const ownedMemberships = memberships.filter((item) => item.member.role === "owner");
    const ownerCounts = await Promise.all(
      ownedMemberships.map(async (item) => {
        const [{ total }] = await this.db
          .select({ total: count() })
          .from(member)
          .where(and(eq(member.organizationId, item.organization.id), eq(member.role, "owner")));
        return { organizationId: item.organization.id, total: total ?? 0 };
      }),
    );

    return {
      userId: id,
      memberships: memberships.length,
      ownedAcademies: ownedMemberships.map((item) => ({
        id: item.organization.id,
        name: item.organization.name,
        slug: item.organization.slug,
        isOnlyOwner:
          (ownerCounts.find((countRow) => countRow.organizationId === item.organization.id)
            ?.total ?? 0) <= 1,
      })),
      studentAccessLinks: studentAccessRows.length,
      activeSessions: activeSessions ?? 0,
      isPlatformAdmin: row.role === "admin" || platformAdminUserIds().includes(row.id),
    };
  }

  async deleteUser(id: string, input: DeleteUserInput) {
    const impact = await this.userDeletionImpact(id);
    const onlyOwnerAcademies = impact.ownedAcademies.filter((academy) => academy.isOnlyOwner);

    if (onlyOwnerAcademies.length > 0) {
      if (!input.ownerResolution) {
        throw new BadRequestException("Resolva a propriedade da academia antes de excluir.");
      }

      if (input.ownerResolution === "transfer") {
        if (!input.transferOwnerEmail) {
          throw new BadRequestException("Email do novo dono é obrigatório.");
        }
        for (const academy of onlyOwnerAcademies) {
          await this.platformAcademies.transferAcademy(academy.id, {
            ownerEmail: input.transferOwnerEmail,
            ...(input.transferOwnerName ? { ownerName: input.transferOwnerName } : {}),
          });
        }
      }

      if (input.ownerResolution === "keep_ownerless") {
        for (const academy of onlyOwnerAcademies) {
          await this.db
            .delete(member)
            .where(
              and(
                eq(member.organizationId, academy.id),
                eq(member.userId, id),
                eq(member.role, "owner"),
              ),
            );
        }
      }
    }

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
}

export type PlatformUserSummary = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
};

type UserRow = typeof user.$inferSelect;

function toUserSummary(row: UserRow): PlatformUserSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image ?? null,
    role: row.role ?? null,
    banned: row.banned,
    banReason: row.banReason ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
