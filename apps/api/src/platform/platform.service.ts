import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { type Database, member, organization, user } from "@tatamiq/database";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { DATABASE } from "../database/database.module";

export type PlatformDashboard = {
  totals: {
    academies: number;
    users: number;
    admins: number;
    bannedUsers: number;
  };
  recentAcademies: PlatformAcademySummary[];
};

export type PlatformAcademySummary = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  owner: PlatformAcademyOwner | null;
};

export type PlatformAcademyDetail = PlatformAcademySummary & {
  address: string | null;
  phone: string | null;
  instagram: string | null;
};

type PlatformAcademyOwner = {
  id: string;
  name: string;
  email: string;
};

@Injectable()
export class PlatformService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async dashboard(): Promise<PlatformDashboard> {
    const [[academyTotal], [userTotal], [adminTotal], [bannedTotal], recentAcademies] =
      await Promise.all([
        this.db.select({ total: count() }).from(organization),
        this.db.select({ total: count() }).from(user),
        this.db.select({ total: count() }).from(user).where(eq(user.role, "admin")),
        this.db.select({ total: count() }).from(user).where(eq(user.banned, true)),
        this.listAcademies({ page: 0, pageSize: 5 }),
      ]);

    return {
      totals: {
        academies: academyTotal?.total ?? 0,
        users: userTotal?.total ?? 0,
        admins: adminTotal?.total ?? 0,
        bannedUsers: bannedTotal?.total ?? 0,
      },
      recentAcademies: recentAcademies.items,
    };
  }

  async listAcademies(options: { query?: string; page?: number; pageSize?: number } = {}) {
    const page = Math.max(0, options.page ?? 0);
    const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));
    const query = options.query?.trim();
    const where = query
      ? or(
          ilike(organization.name, `%${query}%`),
          ilike(organization.slug, `%${query}%`),
          ilike(user.email, `%${query}%`),
        )
      : undefined;

    const baseRows = this.db
      .select({ organization, owner: user })
      .from(organization)
      .leftJoin(
        member,
        // Only the technical owner represents the Dono/Instrutor Solo in V1.
        and(eq(member.organizationId, organization.id), eq(member.role, "owner")),
      )
      .leftJoin(user, eq(user.id, member.userId))
      .where(where)
      .orderBy(desc(organization.createdAt))
      .limit(pageSize)
      .offset(page * pageSize);

    const totalRows = this.db
      .select({ total: count() })
      .from(organization)
      .leftJoin(member, and(eq(member.organizationId, organization.id), eq(member.role, "owner")))
      .leftJoin(user, eq(user.id, member.userId))
      .where(where);

    const [rows, [{ total }]] = await Promise.all([baseRows, totalRows]);

    return {
      items: rows.map((row) => toAcademySummary(row.organization, row.owner)),
      pagination: {
        page,
        pageSize,
        total: total ?? 0,
        totalPages: Math.ceil((total ?? 0) / pageSize),
      },
    };
  }

  async getAcademy(id: string): Promise<PlatformAcademyDetail> {
    const [row] = await this.db
      .select({ organization, owner: user })
      .from(organization)
      .leftJoin(member, and(eq(member.organizationId, organization.id), eq(member.role, "owner")))
      .leftJoin(user, eq(user.id, member.userId))
      .where(eq(organization.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException("Academia não encontrada.");
    }

    return {
      ...toAcademySummary(row.organization, row.owner),
      address: row.organization.address,
      phone: row.organization.phone,
      instagram: row.organization.instagram,
    };
  }
}

type OrganizationRow = typeof organization.$inferSelect;
type UserRow = typeof user.$inferSelect;

function toAcademySummary(org: OrganizationRow, owner: UserRow | null): PlatformAcademySummary {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo,
    createdAt: org.createdAt.toISOString(),
    owner: owner
      ? {
          id: owner.id,
          name: owner.name,
          email: owner.email,
        }
      : null,
  };
}
