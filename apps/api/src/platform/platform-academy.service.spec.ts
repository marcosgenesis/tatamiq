import { describe, expect, it, vi } from "vitest";
import { PlatformAcademyService } from "./platform-academy.service";

type QueryRows = Array<Record<string, unknown>>;

function createListAcademiesDbMock(options: {
  matchingResponsibleOrganizationIds?: QueryRows;
  academyRows?: QueryRows;
  totalRows?: QueryRows;
  responsibleRows?: QueryRows;
}) {
  let selectCall = 0;

  return {
    db: {
      selectDistinct: vi.fn(() => ({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(options.matchingResponsibleOrganizationIds ?? []),
          })),
        })),
      })),
      select: vi.fn(() => {
        selectCall += 1;

        if (selectCall === 1) {
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    offset: vi.fn().mockResolvedValue(options.academyRows ?? []),
                  })),
                })),
              })),
            })),
          };
        }

        if (selectCall === 2) {
          return {
            from: vi.fn(() => ({
              where: vi.fn().mockResolvedValue(options.totalRows ?? [{ total: 0 }]),
            })),
          };
        }

        return {
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn().mockResolvedValue(options.responsibleRows ?? []),
            })),
          })),
        };
      }),
    },
  };
}

describe("PlatformAcademyService listAcademies", () => {
  it("finds academies by responsible name without duplicating academy rows", async () => {
    const createdAt = new Date("2026-07-17T12:00:00.000Z");
    const { db } = createListAcademiesDbMock({
      matchingResponsibleOrganizationIds: [{ organizationId: "org-1" }],
      academyRows: [
        {
          organization: {
            id: "org-1",
            name: "Tatame Centro",
            slug: "tatame-centro",
            logo: null,
            createdAt,
          },
        },
      ],
      totalRows: [{ total: 1 }],
      responsibleRows: [
        {
          organizationId: "org-1",
          user: { id: "user-1", name: "Ana Costa", email: "ana@tatamiq.local" },
        },
        {
          organizationId: "org-1",
          user: { id: "user-2", name: "Beto Lima", email: "beto@tatamiq.local" },
        },
      ],
    });
    const service = new PlatformAcademyService(db as never, {} as never);

    const byName = await service.listAcademies({ query: "Ana", page: 0, pageSize: 10 });

    expect(byName.items).toHaveLength(1);
    expect(byName.items[0]).toMatchObject({
      id: "org-1",
      responsibles: [
        { id: "user-1", name: "Ana Costa", email: "ana@tatamiq.local" },
        { id: "user-2", name: "Beto Lima", email: "beto@tatamiq.local" },
      ],
    });
    expect(byName.pagination).toMatchObject({ total: 1, totalPages: 1 });
  });

  it("finds academies by responsible email without duplicating academy rows", async () => {
    const createdAt = new Date("2026-07-17T12:00:00.000Z");
    const { db } = createListAcademiesDbMock({
      matchingResponsibleOrganizationIds: [{ organizationId: "org-1" }],
      academyRows: [
        {
          organization: {
            id: "org-1",
            name: "Tatame Centro",
            slug: "tatame-centro",
            logo: null,
            createdAt,
          },
        },
      ],
      totalRows: [{ total: 1 }],
      responsibleRows: [
        {
          organizationId: "org-1",
          user: { id: "user-1", name: "Ana Costa", email: "ana@tatamiq.local" },
        },
        {
          organizationId: "org-1",
          user: { id: "user-2", name: "Beto Lima", email: "beto@tatamiq.local" },
        },
      ],
    });
    const service = new PlatformAcademyService(db as never, {} as never);

    const byEmail = await service.listAcademies({
      query: "beto@tatamiq.local",
      page: 0,
      pageSize: 10,
    });

    expect(byEmail.items.map((academy) => academy.id)).toEqual(["org-1"]);
    expect(byEmail.pagination).toMatchObject({ total: 1, totalPages: 1 });
  });

  it("skips responsible matching work when no search query is provided", async () => {
    const createdAt = new Date("2026-07-17T12:00:00.000Z");
    const { db } = createListAcademiesDbMock({
      academyRows: [
        {
          organization: {
            id: "org-1",
            name: "Tatame Centro",
            slug: "tatame-centro",
            logo: null,
            createdAt,
          },
        },
      ],
      totalRows: [{ total: 1 }],
      responsibleRows: [
        {
          organizationId: "org-1",
          user: { id: "user-1", name: "Ana Costa", email: "ana@tatamiq.local" },
        },
      ],
    });
    const service = new PlatformAcademyService(db as never, {} as never);

    const result = await service.listAcademies({ page: 0, pageSize: 10 });

    expect(result.items).toHaveLength(1);
    expect(db.selectDistinct).not.toHaveBeenCalled();
  });
});
