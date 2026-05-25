import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

type StudentStatusFilter = "active" | "inactive" | "all";

export function useStudents(
  status: StudentStatusFilter,
  pagination?: { page: number; pageSize: number },
  options?: { enabled?: boolean },
) {
  const page = pagination?.page ?? 0;
  const pageSize = pagination?.pageSize ?? 10;

  return useQuery({
    queryKey: ["students", status, page, pageSize],
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
