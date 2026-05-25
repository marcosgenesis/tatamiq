import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { api } from "@/api";
import { DashboardCard } from "@/components/dashboard-card";
import { formatDate } from "@/components/formater";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff).toISOString().split("T")[0];
}

const chartConfig = {
  students: {
    label: "Alunos",
    color: "var(--chart-2)",
  },
  attendance: {
    label: "Presenças",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function WeeklyClassesChart() {
  const weekStart = getWeekStart();
  const chartUid = useId().replace(/:/g, "");
  const idLineGlow = `classes-line-glow-${chartUid}`;

  const weekQuery = useQuery({
    queryKey: ["schedule", "week", weekStart],
    queryFn: async () => {
      const { data, error } = await api.GET("/schedule/week", {
        params: { query: { weekStart } },
      });
      if (error) return null;
      return data;
    },
  });

  const chartRows = (weekQuery.data?.days ?? []).map((d) => {
    const active = d.occurrences.filter((o) => o.status !== "cancelled");
    const students = active.reduce((sum, o) => sum + o.studentCount, 0);
    const attendance = active
      .filter((o) => o.status === "ended")
      .reduce((sum, o) => sum + (o.attendanceCount ?? 0), 0);
    return { date: d.date, students, attendance };
  });

  return (
    <DashboardCard className="gap-0 md:col-span-2">
      <CardHeader>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Alunos x Presenças</CardTitle>
          </div>
          <CardDescription>Alunos matriculados vs presenças por dia, semana atual.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer className="aspect-auto h-60 w-full p-0 md:h-80" config={chartConfig}>
          <LineChart accessibilityLayer data={chartRows} margin={{ left: 12, right: 12, top: 8 }}>
            <CartesianGrid className="stroke-border" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              interval={0}
              tickFormatter={(value) => formatDate(String(value), "day-month")}
              tickLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
            <defs>
              <filter height="140%" id={idLineGlow} width="140%" x="-20%" y="-20%">
                <feGaussianBlur result="blur" stdDeviation="10" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <Line
              dataKey="attendance"
              dot={false}
              filter={`url(#${idLineGlow})`}
              stroke="var(--color-attendance)"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="students"
              dot={false}
              filter={`url(#${idLineGlow})`}
              stroke="var(--color-students)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </DashboardCard>
  );
}
