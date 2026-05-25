import { useQuery } from "@tanstack/react-query";
import { Calendar03Icon, UserMultipleIcon } from "hugeicons-react";
import { api } from "@/api";
import { DashboardCard } from "@/components/dashboard-card";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardActivity() {
  const todayQuery = useQuery({
    queryKey: ["schedule", "today"],
    queryFn: async () => {
      const { data, error } = await api.GET("/schedule/today");
      if (error) return null;
      return data;
    },
  });

  const occurrences = (todayQuery.data?.occurrences ?? [])
    .filter((o) => o.status !== "cancelled")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <DashboardCard className="gap-0">
      <CardHeader className="border-b">
        <CardTitle>Aulas de hoje</CardTitle>
        <CardDescription>Programação do dia.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {occurrences.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Nenhuma aula programada para hoje.
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {occurrences.map((occ) => (
              <li className="flex h-16 items-center gap-3 px-6" key={occ.id}>
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center [&_svg]:size-4"
                >
                  <Calendar03Icon />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-1 text-pretty text-foreground text-sm leading-snug">
                    {occ.classGroupName}
                  </p>
                  <p className="text-muted-foreground text-xs flex items-center gap-2">
                    <span>
                      {occ.startTime} · {occ.durationMinutes}min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <UserMultipleIcon className="size-3" />
                      {occ.attendanceCount ?? 0}/{occ.studentCount}
                    </span>
                    {occ.status === "ended" && (
                      <span className="text-emerald-600 dark:text-emerald-400">Finalizada</span>
                    )}
                    {occ.status === "active" && <span className="text-primary">Em andamento</span>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </DashboardCard>
  );
}
