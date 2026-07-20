import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PreRegistrationPublicProfile } from "@tatamiq/contracts";
import { academyPreRegistrationLinks, belts, type Database, organization } from "@tatamiq/database";
import { asc, eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { createLinkToken, parseLinkStatus } from "./pre-registration-link-rules";

type LinkRow = typeof academyPreRegistrationLinks.$inferSelect;

export type ActiveLink = {
  linkId: string;
  organizationId: string;
};

@Injectable()
export class PreRegistrationLinkLifecycle {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getOrCreateLink(organizationId: string): Promise<{ linkId: string }> {
    const existing = await this.findByOrganization(organizationId);
    if (existing) return { linkId: existing.id };

    const now = new Date();
    const [created] = await this.db
      .insert(academyPreRegistrationLinks)
      .values({
        id: crypto.randomUUID(),
        organizationId,
        token: createLinkToken(),
        status: "active",
        regeneratedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return { linkId: created.id };
  }

  async pauseLink(organizationId: string): Promise<void> {
    await this.getOrCreateLink(organizationId);
    await this.db
      .update(academyPreRegistrationLinks)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(academyPreRegistrationLinks.organizationId, organizationId));
  }

  async reactivateLink(organizationId: string): Promise<void> {
    await this.getOrCreateLink(organizationId);
    await this.db
      .update(academyPreRegistrationLinks)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(academyPreRegistrationLinks.organizationId, organizationId));
  }

  async regenerateLink(organizationId: string): Promise<void> {
    await this.getOrCreateLink(organizationId);
    const now = new Date();
    await this.db
      .update(academyPreRegistrationLinks)
      .set({
        token: createLinkToken(),
        status: "active",
        regeneratedAt: now,
        updatedAt: now,
      })
      .where(eq(academyPreRegistrationLinks.organizationId, organizationId));
  }

  async markCopied(organizationId: string): Promise<void> {
    const { linkId } = await this.getOrCreateLink(organizationId);
    const existing = await this.findByOrganization(organizationId);
    if (existing?.copiedAt) return;

    const now = new Date();
    await this.db
      .update(academyPreRegistrationLinks)
      .set({ copiedAt: now, updatedAt: now })
      .where(eq(academyPreRegistrationLinks.id, linkId));
  }

  async resolvePublicProfile(token: string): Promise<PreRegistrationPublicProfile> {
    const found = await this.findPublicLink(token);
    if (!found) throw new NotFoundException("Link de pré-cadastro não encontrado.");

    const academyBelts = await this.db
      .select()
      .from(belts)
      .where(eq(belts.organizationId, found.link.organizationId))
      .orderBy(asc(belts.position));

    return {
      academy: {
        name: found.academy.name,
        logo: found.academy.logo ?? null,
        address: found.academy.address ?? null,
        phone: found.academy.phone ?? null,
        instagram: found.academy.instagram ?? null,
      },
      link: { status: parseLinkStatus(found.link.status) },
      belts: academyBelts.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        path: b.path as "adult" | "child",
        position: b.position,
        maxDegrees: b.maxDegrees,
        minMonthsForNextDegree: b.minMonthsForNextDegree,
        minAttendancesForNextDegree: b.minAttendancesForNextDegree,
        minMonthsForNextBelt: b.minMonthsForNextBelt,
        minAttendancesForNextBelt: b.minAttendancesForNextBelt,
      })),
    };
  }

  async resolveActiveLink(token: string): Promise<ActiveLink> {
    const found = await this.findPublicLink(token);
    if (!found) throw new NotFoundException("Link de pré-cadastro não encontrado.");
    if (found.link.status !== "active") {
      throw new BadRequestException("Este link de pré-cadastro está pausado.");
    }
    return { linkId: found.link.id, organizationId: found.link.organizationId };
  }

  private async findByOrganization(organizationId: string): Promise<LinkRow | null> {
    const [row] = await this.db
      .select()
      .from(academyPreRegistrationLinks)
      .where(eq(academyPreRegistrationLinks.organizationId, organizationId))
      .limit(1);
    return row ?? null;
  }

  private async findPublicLink(token: string) {
    const [row] = await this.db
      .select({ link: academyPreRegistrationLinks, academy: organization })
      .from(academyPreRegistrationLinks)
      .innerJoin(organization, eq(academyPreRegistrationLinks.organizationId, organization.id))
      .where(eq(academyPreRegistrationLinks.token, token))
      .limit(1);
    return row ?? null;
  }
}
