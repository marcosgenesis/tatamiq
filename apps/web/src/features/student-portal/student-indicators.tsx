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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (api.GET as never)("/student/indicators");
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (api.POST as never)("/student/indicators/mark-seen", { body: { type } });
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
