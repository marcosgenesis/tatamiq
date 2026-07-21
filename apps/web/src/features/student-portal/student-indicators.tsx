import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MarkSeenInput, StudentIndicatorsResponse } from "@tatamiq/contracts";
import { api } from "../../api";
import { authClient } from "../../lib/auth-client";
import { studentQueryKey } from "../../lib/session-query-keys";

export type IndicatorType = MarkSeenInput["type"];

export function useStudentIndicators() {
  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id;
  return useQuery({
    queryKey: studentQueryKey(sessionUserId, "indicators"),
    queryFn: async () => {
      const { data, error } = await api.GET("/student/indicators");
      if (error || !data) return null;
      return data satisfies StudentIndicatorsResponse;
    },
    enabled: !!sessionUserId,
    refetchInterval: 60_000,
  });
}

export function useMarkIndicatorSeen() {
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id;
  return useMutation({
    mutationFn: async (type: IndicatorType) => {
      await api.POST("/student/indicators/mark-seen", { body: { type } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: studentQueryKey(sessionUserId, "indicators"),
      });
    },
  });
}

export function IndicatorDot({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary" />;
}
