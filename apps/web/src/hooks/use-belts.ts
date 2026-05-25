import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export function useBelts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["belts"],
    queryFn: async () => {
      const { data, error } = await api.GET("/belts");
      if (error) throw new Error("Não foi possível carregar faixas.");
      return data;
    },
    ...(options?.enabled !== undefined && { enabled: options.enabled }),
  });
}
