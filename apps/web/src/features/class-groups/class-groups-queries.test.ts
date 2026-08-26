import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.hoisted(() => vi.fn());

vi.mock("../../api", () => ({ api: { GET: get } }));

import { listActiveStudentsForClassGroups } from "./class-groups-queries";

describe("listActiveStudentsForClassGroups", () => {
  beforeEach(() => get.mockReset());

  it("loads every page used by the class-group student picker", async () => {
    const firstStudent = { id: "student-1", name: "Aluno 1", belt: null };
    const secondStudent = { id: "student-101", name: "Aluno 101", belt: null };
    get
      .mockResolvedValueOnce({
        data: {
          students: [firstStudent],
          pagination: { page: 0, pageSize: 100, total: 101, totalPages: 2 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          students: [secondStudent],
          pagination: { page: 1, pageSize: 100, total: 101, totalPages: 2 },
        },
      });

    await expect(listActiveStudentsForClassGroups()).resolves.toEqual([
      firstStudent,
      secondStudent,
    ]);
    expect(get).toHaveBeenNthCalledWith(1, "/students", {
      params: { query: { status: "active", page: 0, pageSize: 100 } },
    });
    expect(get).toHaveBeenNthCalledWith(2, "/students", {
      params: { query: { status: "active", page: 1, pageSize: 100 } },
    });
  });
});
