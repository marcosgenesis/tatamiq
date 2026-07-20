import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreRegistrationLinkLifecycle } from "./pre-registration-link-lifecycle";

type MockRow = Record<string, unknown>;

function createMockDb(selectResults: MockRow[][] = []) {
  const inserted: MockRow[] = [];
  const updates: MockRow[] = [];
  let selectCallIndex = 0;

  const nextSelectResult = () => {
    const result = selectResults[selectCallIndex] ?? [];
    selectCallIndex++;
    return Promise.resolve(result);
  };

  const whereChain = () => ({
    limit: vi.fn().mockImplementation(nextSelectResult),
    orderBy: vi.fn().mockImplementation(nextSelectResult),
  });

  const chainableSelect = () => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(whereChain),
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(whereChain),
      }),
    }),
  });

  const db = {
    select: vi.fn().mockImplementation(chainableSelect),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation((values: MockRow) => ({
        where: vi.fn().mockImplementation(() => {
          updates.push(values);
          return Promise.resolve();
        }),
      })),
    })),
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((values: MockRow) => {
        inserted.push(values);
        return {
          returning: vi.fn().mockResolvedValue([{ ...values }]),
        };
      }),
    })),
  };

  return { db, inserted, updates };
}

function linkRow(overrides: MockRow = {}): MockRow {
  return {
    id: "link-1",
    organizationId: "org-1",
    token: "existing-token",
    status: "active",
    regeneratedAt: null,
    copiedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function publicLinkRow(overrides: { link?: MockRow; academy?: MockRow } = {}): MockRow {
  return {
    link: {
      id: "link-1",
      organizationId: "org-1",
      token: "public-token",
      status: "active",
      ...overrides.link,
    },
    academy: {
      name: "Academia Test",
      logo: null,
      address: "Rua Test 123",
      phone: "11999999999",
      instagram: "@test",
      ...overrides.academy,
    },
  };
}

describe("PreRegistrationLinkLifecycle", () => {
  let service: PreRegistrationLinkLifecycle;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getOrCreateLink", () => {
    it("returns existing link when one exists for the organization", async () => {
      const mock = createMockDb([[linkRow()]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      const result = await service.getOrCreateLink("org-1");

      expect(result.linkId).toBe("link-1");
      expect(mock.inserted).toHaveLength(0);
    });

    it("creates a new active link when none exists", async () => {
      const mock = createMockDb([[]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      const result = await service.getOrCreateLink("org-1");

      expect(result.linkId).toBeTruthy();
      expect(mock.inserted).toHaveLength(1);
      expect(mock.inserted[0]).toMatchObject({
        organizationId: "org-1",
        status: "active",
        regeneratedAt: null,
      });
      expect(mock.inserted[0].token).toBeTruthy();
    });
  });

  describe("pauseLink", () => {
    it("sets the link status to paused", async () => {
      const mock = createMockDb([[linkRow()]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      await service.pauseLink("org-1");

      expect(mock.updates).toHaveLength(1);
      expect(mock.updates[0]).toMatchObject({ status: "paused" });
    });
  });

  describe("reactivateLink", () => {
    it("sets the link status to active", async () => {
      const mock = createMockDb([[linkRow({ status: "paused" })]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      await service.reactivateLink("org-1");

      expect(mock.updates).toHaveLength(1);
      expect(mock.updates[0]).toMatchObject({ status: "active" });
    });
  });

  describe("regenerateLink", () => {
    it("creates a new token and sets status to active", async () => {
      const mock = createMockDb([[linkRow({ status: "paused" })]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      await service.regenerateLink("org-1");

      expect(mock.updates).toHaveLength(1);
      expect(mock.updates[0].status).toBe("active");
      expect(mock.updates[0].token).toBeTruthy();
      expect(mock.updates[0].token).not.toBe("existing-token");
      expect(mock.updates[0].regeneratedAt).toBeInstanceOf(Date);
    });
  });

  describe("markCopied", () => {
    it("sets copiedAt the first time the link is copied", async () => {
      const mock = createMockDb([[linkRow()], [linkRow()]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      await service.markCopied("org-1");

      expect(mock.updates).toHaveLength(1);
      expect(mock.updates[0].copiedAt).toBeInstanceOf(Date);
    });

    it("does not overwrite copiedAt after it was already set", async () => {
      const copiedAt = new Date("2026-01-01T10:00:00.000Z");
      const mock = createMockDb([[linkRow({ copiedAt })], [linkRow({ copiedAt })]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      await service.markCopied("org-1");

      expect(mock.updates).toHaveLength(0);
    });
  });

  describe("resolvePublicProfile", () => {
    it("returns academy details and link status for a valid token", async () => {
      const mock = createMockDb([[publicLinkRow()]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      const result = await service.resolvePublicProfile("public-token");

      expect(result.academy.name).toBe("Academia Test");
      expect(result.academy.address).toBe("Rua Test 123");
      expect(result.academy.phone).toBe("11999999999");
      expect(result.academy.instagram).toBe("@test");
      expect(result.link.status).toBe("active");
    });

    it("returns paused status when the link is paused", async () => {
      const mock = createMockDb([[publicLinkRow({ link: { status: "paused" } })]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      const result = await service.resolvePublicProfile("public-token");

      expect(result.link.status).toBe("paused");
    });

    it("throws NotFoundException when token does not exist", async () => {
      const mock = createMockDb([[]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      await expect(service.resolvePublicProfile("invalid-token")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("resolveActiveLink", () => {
    it("returns link id and organization id for an active link", async () => {
      const mock = createMockDb([[publicLinkRow()]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      const result = await service.resolveActiveLink("public-token");

      expect(result.linkId).toBe("link-1");
      expect(result.organizationId).toBe("org-1");
    });

    it("throws BadRequestException when link is paused", async () => {
      const mock = createMockDb([[publicLinkRow({ link: { status: "paused" } })]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      await expect(service.resolveActiveLink("public-token")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("throws NotFoundException when token does not exist", async () => {
      const mock = createMockDb([[]]);
      service = new PreRegistrationLinkLifecycle(mock.db as never);

      await expect(service.resolveActiveLink("invalid-token")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
