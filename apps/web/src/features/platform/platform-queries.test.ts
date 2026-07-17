import { describe, expect, it } from "vitest";
import {
  platformDashboardQuery,
  platformMeQuery,
  platformUsersQuery,
  removeAcademyFromAcademiesResponse,
} from "./platform-queries";

describe("platform query keys", () => {
  it("scopes platform access cache by authenticated user", () => {
    expect(platformMeQuery("admin-user").queryKey).not.toEqual(
      platformMeQuery("new-user").queryKey,
    );
    expect(platformMeQuery("admin-user").queryKey).toEqual(["platform", "me", "admin-user"]);
  });

  it("scopes platform data caches by authenticated administrator", () => {
    expect(platformDashboardQuery("admin-user").queryKey).not.toEqual(
      platformDashboardQuery("other-admin").queryKey,
    );
    expect(platformUsersQuery("admin-user", "", 0, 10).queryKey).toEqual([
      "platform",
      "users",
      "admin-user",
      "",
      0,
      10,
    ]);
  });

  it("removes a deleted academy from cached academy list pages immediately", () => {
    expect(
      removeAcademyFromAcademiesResponse(
        {
          items: [
            {
              id: "academy-1",
              name: "Deleted",
              slug: "deleted",
              logo: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              responsibles: [],
            },
            {
              id: "academy-2",
              name: "Kept",
              slug: "kept",
              logo: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              responsibles: [],
            },
          ],
          pagination: { page: 0, pageSize: 10, total: 2, totalPages: 1 },
        },
        "academy-1",
      ),
    ).toEqual({
      items: [
        {
          id: "academy-2",
          name: "Kept",
          slug: "kept",
          logo: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          responsibles: [],
        },
      ],
      pagination: { page: 0, pageSize: 10, total: 1, totalPages: 1 },
    });
  });
});
