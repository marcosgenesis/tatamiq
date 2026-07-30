import { api } from "../../api";
import { academyQueryKey } from "../../lib/academy-query-keys";
import type { ClassGroupPayload } from "./class-group-form";

export type ClassGroupStatusFilter = "active" | "archived" | "all";

const STUDENT_PICKER_PAGE_SIZE = 100;

/** Load every active student so the class-group picker can search beyond the first API page. */
export async function listActiveStudentsForClassGroups() {
  const students = [];
  let page = 0;
  let totalPages = 1;

  do {
    const { data, error } = await api.GET("/students", {
      params: {
        query: { status: "active", page, pageSize: STUDENT_PICKER_PAGE_SIZE },
      },
    });
    if (error) throw new Error("Não foi possível carregar alunos.");

    students.push(...data.students);
    totalPages = data.pagination.totalPages;
    page += 1;
  } while (page < totalPages);

  return students;
}

/** Create (id null) or update a class group. Canonical endpoint used by both desktop and mobile. */
export async function saveClassGroup(id: string | null, payload: ClassGroupPayload): Promise<void> {
  if (id) {
    const { error } = await api.PATCH("/class-groups/{id}", {
      params: { path: { id } },
      body: payload,
    });
    if (error) throw new Error("Não foi possível salvar a turma.");
    return;
  }
  const { error } = await api.POST("/class-groups", { body: payload });
  if (error) throw new Error("Não foi possível criar a turma.");
}

/** Archive or reactivate a class group. */
export async function setClassGroupStatus(
  id: string,
  action: "archive" | "reactivate",
): Promise<void> {
  if (action === "archive") {
    const { error } = await api.POST("/class-groups/{id}/archive", { params: { path: { id } } });
    if (error) throw new Error("Não foi possível arquivar a turma.");
    return;
  }
  const { error } = await api.POST("/class-groups/{id}/reactivate", { params: { path: { id } } });
  if (error) throw new Error("Não foi possível reativar a turma.");
}

export const classGroupsKeys = {
  all: (academyId: string | null | undefined) => academyQueryKey(academyId, "class-groups"),
  list: (academyId: string | null | undefined, status: ClassGroupStatusFilter) =>
    academyQueryKey(academyId, "class-groups", status),
  students: (academyId: string | null | undefined) =>
    academyQueryKey(academyId, "students", "active", "for-class-groups"),
};
