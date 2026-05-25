import { BadRequestException } from "@nestjs/common";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import type { auth } from "./auth";

export type SessionWithOrganization = UserSession<typeof auth> & {
  session: { activeOrganizationId?: string | null };
};

export type SessionWithUser = UserSession<typeof auth> & {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

export function activeOrganizationId(session: SessionWithOrganization | SessionWithUser): string {
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new BadRequestException("Nenhuma organização ativa.");
  return organizationId;
}
