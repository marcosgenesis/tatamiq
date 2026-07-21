import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { academyQueryKey } from "../../lib/academy-query-keys";
import { classGroupsKeys } from "./class-groups-queries";

describe("class group query keys", () => {
  it("keeps Turma lists under the Academia query namespace", () => {
    expect(classGroupsKeys.all("academy-1")).toEqual(academyQueryKey("academy-1", "class-groups"));
    expect(classGroupsKeys.list("academy-1", "active")).toEqual(
      academyQueryKey("academy-1", "class-groups", "active"),
    );
  });

  it("keeps its Aluno picker under the shared Aluno namespace", () => {
    expect(classGroupsKeys.students("academy-1")).toEqual(
      academyQueryKey("academy-1", "students", "active", "for-class-groups"),
    );
  });

  it("lets shared domain invalidation refresh Turma and Aluno-derived lists", async () => {
    const queryClient = new QueryClient();
    const classGroupsListKey = classGroupsKeys.list("academy-1", "active");
    const classGroupsStudentsKey = classGroupsKeys.students("academy-1");

    queryClient.setQueryData(classGroupsListKey, { classGroups: [] });
    queryClient.setQueryData(classGroupsStudentsKey, []);

    await queryClient.invalidateQueries({ queryKey: academyQueryKey("academy-1", "class-groups") });
    await queryClient.invalidateQueries({ queryKey: academyQueryKey("academy-1", "students") });

    expect(queryClient.getQueryState(classGroupsListKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(classGroupsStudentsKey)?.isInvalidated).toBe(true);
  });
});
