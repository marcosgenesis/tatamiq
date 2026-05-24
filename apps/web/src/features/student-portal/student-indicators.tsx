import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";

export type IndicatorType = "fees" | "notes" | "graduation" | "schedule";

type IndicatorData = {
  hasNewFees: boolean;
  hasNewNotes: boolean;
  hasNewPromotion: boolean;
  hasCancelledClass: boolean;
};

export function useStudentIndicators() {
  return useQuery({
    queryKey: ["student", "indicators"],
    queryFn: async () => {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { data, error } = await (api.GET as any)("/student/indicators");
      if (error) return null;
      return data as IndicatorData;
    },
    refetchInterval: 60_000,
  });
}

export function useMarkIndicatorSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (type: IndicatorType) => {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      await (api.POST as any)("/student/indicators/mark-seen", { body: { type } });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["student", "indicators"] });
    },
  });
}

export function IndicatorDot({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary" />;
}
