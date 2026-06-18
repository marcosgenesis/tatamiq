import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { academyQueryKey } from "../lib/academy-query-keys";

export function useBelts(options?: { enabled?: boolean; academyId?: string | null }) {
  return useQuery({
    queryKey: academyQueryKey(options?.academyId, "belts"),
    queryFn: async () => {
      const { data, error } = await api.GET("/belts");
      if (error) throw new Error("Não foi possível carregar faixas.");
      return data;
    },
    ...(options?.enabled !== undefined && { enabled: options.enabled }),
  });
}
