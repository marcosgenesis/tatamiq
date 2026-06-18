import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { academyQueryKey } from "../lib/academy-query-keys";

type StudentStatusFilter = "active" | "inactive" | "all";

export function useStudents(
  status: StudentStatusFilter,
  pagination?: { page: number; pageSize: number },
  options?: { enabled?: boolean; academyId?: string | null },
) {
  const page = pagination?.page ?? 0;
  const pageSize = pagination?.pageSize ?? 10;

  return useQuery({
    queryKey: academyQueryKey(options?.academyId, "students", status, page, pageSize),
    queryFn: async () => {
      const { data, error } = await api.GET("/students", {
        params: { query: { status, page, pageSize } },
      });
      if (error) throw new Error("Não foi possível carregar alunos.");
      return data;
    },
    ...(options?.enabled !== undefined && { enabled: options.enabled }),
    placeholderData: (prev) => prev,
  });
}
