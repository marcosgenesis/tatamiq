import { academyQueryKey } from "../../lib/academy-query-keys";

export type ClassGroupStatusFilter = "active" | "archived" | "all";

export const classGroupsKeys = {
  all: (academyId: string | null | undefined) => academyQueryKey(academyId, "class-groups"),
  list: (academyId: string | null | undefined, status: ClassGroupStatusFilter) =>
    academyQueryKey(academyId, "class-groups", status),
  students: (academyId: string | null | undefined) =>
    academyQueryKey(academyId, "students", "active", "for-class-groups"),
};
