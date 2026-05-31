import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { type Database, session, user } from "@tatamiq/database";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { count, eq, inArray, or } from "drizzle-orm";
import { type auth, platformAdminUserIds } from "../auth";
import { DATABASE } from "../database/database.module";
import { ReservedAccountService } from "./reserved-account.service";

export type PlatformSession = UserSession<typeof auth> & {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
  session: {
    id: string;
    activeOrganizationId?: string | null;
    impersonatedBy?: string | null;
  };
};

export type PlatformMe = {
  isAdmin: true;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string | null;
  };
};

export function isPlatformAdminUser(
  user: { id: string; role?: string | null },
  adminIds: string[],
) {
  return user.role === "admin" || adminIds.includes(user.id);
}

export type PlatformAdministrator = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean;
  configured: boolean;
  createdAt: string;
};

export type AddPlatformAdministratorResult = {
  administrator: PlatformAdministrator;
  userWasCreated: boolean;
  firstAccessLink: string | null;
};

type UserRow = typeof user.$inferSelect;

@Injectable()
export class PlatformAdminService {
  constructor(
    @Inject(DATABASE) private readonly db?: Database,
    @Inject(ReservedAccountService) private readonly reservedAccounts?: ReservedAccountService,
  ) {}

  private get dbRequired(): Database {
    if (!this.db) throw new Error("Database dependency not configured.");
    return this.db;
  }

  private get reservedAccountsRequired(): ReservedAccountService {
    if (!this.reservedAccounts)
      throw new Error("ReservedAccountService dependency not configured.");
    return this.reservedAccounts;
  }

  assertPlatformAdmin(session: PlatformSession): PlatformMe {
    if (!isPlatformAdminUser(session.user, platformAdminUserIds())) {
      throw new ForbiddenException("Acesso restrito a Administradores da Plataforma.");
    }

    return {
      isAdmin: true,
      user: {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
        role: session.user.role ?? null,
      },
    };
  }

  async listAdministrators(options: { page?: number; pageSize?: number } = {}): Promise<{
    items: PlatformAdministrator[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const page = Math.max(0, options.page ?? 0);
    const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));
    const configuredIds = platformAdminUserIds();
    const roleCondition = eq(user.role, "admin");
    const where =
      configuredIds.length > 0 ? or(roleCondition, inArray(user.id, configuredIds)) : roleCondition;

    const db = this.dbRequired;
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(user)
        .where(where)
        .orderBy(user.email)
        .limit(pageSize)
        .offset(page * pageSize),
      db.select({ total: count() }).from(user).where(where),
    ]);

    return {
      items: rows.map((row) => toAdministrator(row, configuredIds)),
      pagination: {
        page,
        pageSize,
        total: total ?? 0,
        totalPages: Math.ceil((total ?? 0) / pageSize),
      },
    };
  }

  async addAdministrator(input: {
    email: string;
    name?: string;
  }): Promise<AddPlatformAdministratorResult> {
    const email = input.email.trim().toLowerCase();
    const name = input.name?.trim() || email;
    const reserved = await this.reservedAccountsRequired.createOrReuse(email, name);

    const [updated] = await this.dbRequired
      .update(user)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(user.id, reserved.user.id))
      .returning();

    return {
      administrator: toAdministrator(updated ?? reserved.user, platformAdminUserIds()),
      userWasCreated: reserved.isNew,
      firstAccessLink: reserved.firstAccessLink
        ? this.reservedAccountsRequired.firstAccessUrl(reserved.firstAccessLink)
        : null,
    };
  }

  async removeAdministrator(id: string) {
    const db = this.dbRequired;
    const [target] = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!target || !isPlatformAdminUser(target, platformAdminUserIds())) {
      throw new BadRequestException("Administrador da Plataforma não encontrado.");
    }

    const configuredIds = platformAdminUserIds();
    const [{ total }] = await db
      .select({ total: count() })
      .from(user)
      .where(eq(user.role, "admin"));
    const activeAdminCount = new Set([
      ...configuredIds,
      ...((await db.select({ id: user.id }).from(user).where(eq(user.role, "admin"))) ?? []).map(
        (row) => row.id,
      ),
    ]).size;

    if ((total ?? 0) <= 1 || activeAdminCount <= 1) {
      throw new BadRequestException("Não é possível remover o último Administrador da Plataforma.");
    }

    if (configuredIds.includes(id)) {
      throw new BadRequestException(
        "Administrador configurado por ambiente não pode ser removido aqui.",
      );
    }

    await db.update(user).set({ role: null, updatedAt: new Date() }).where(eq(user.id, id));
    await db.delete(session).where(eq(session.userId, id));

    return { success: true };
  }
}

function toAdministrator(row: UserRow, configuredIds: string[]): PlatformAdministrator {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    banned: row.banned,
    configured: configuredIds.includes(row.id),
    createdAt: row.createdAt.toISOString(),
  };
}
