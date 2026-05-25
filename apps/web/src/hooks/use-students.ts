import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

type StudentStatusFilter = "active" | "inactive" | "all";

export function useStudents(status: StudentStatusFilter, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["students", status],
    queryFn: async () => {
      const { data, error } = await api.GET("/students", {
        params: { query: { status } },
      });
      if (error) throw new Error("Não foi possível carregar alunos.");
      return data;
    },
    ...(options?.enabled !== undefined && { enabled: options.enabled }),
  });
}
