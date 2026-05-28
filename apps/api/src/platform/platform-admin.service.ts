import { ForbiddenException, Injectable } from "@nestjs/common";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { type auth, platformAdminUserIds } from "../auth";

export type PlatformSession = UserSession<typeof auth> & {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
  session: {
    activeOrganizationId?: string | null;
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

@Injectable()
export class PlatformAdminService {
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
}
