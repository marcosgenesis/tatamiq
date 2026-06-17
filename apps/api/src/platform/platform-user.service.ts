import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  type Database,
  member,
  organization,
  session,
  studentAccess,
  students,
  user,
} from "@tatamiq/database";
import { count, desc, eq, ilike, or } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { PlatformAdminService } from "./platform-admin.service";

@Injectable()
export class PlatformUserService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(PlatformAdminService) private readonly platformAdmins: PlatformAdminService,
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
    await this.platformAdmins.assertCanDisablePlatformUser(id);

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
