import { useQuery } from "@tanstack/react-query";
import type * as React from "react";
import { Bar, BarChart, XAxis } from "recharts";
import { api } from "@/api";
import { DashboardCard } from "@/components/dashboard-card";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff).toISOString().split("T")[0];
}

const chartConfig = {
  present: {
    label: "Presenças",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function CustomGradientBar(
  props: React.SVGProps<SVGRectElement> & {
    index?: number;
    dataKey?: string | number;
  },
) {
  const { fill, x = 0, y = 0, width = 0, height = 0, dataKey = "present", index = 0 } = props;
  const gid = `gradient-bar-${String(dataKey)}-${index}`;

  return (
    <>
      <rect fill={`url(#${gid})`} height={height} stroke="none" width={width} x={x} y={y} />
      <rect fill={fill} height={2} stroke="none" width={width} x={x} y={y} />
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.5} />
          <stop offset="100%" stopColor={fill} stopOpacity={0} />
        </linearGradient>
      </defs>
    </>
  );
}

export function WeeklyAttendanceChart() {
  const weekStart = getWeekStart();

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
    const present = d.occurrences
      .filter((o) => o.status === "ended")
      .reduce((sum, o) => sum + (o.attendanceCount ?? 0), 0);
    return { day: WEEKDAYS[d.weekday] ?? "", present };
  });

  const totalPresent = chartRows.reduce((sum, r) => sum + r.present, 0);

  return (
    <DashboardCard className="gap-0 md:col-span-2">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Presenças da semana</CardTitle>
        </div>
        <CardDescription>
          Total de presenças por dia, semana atual — {totalPresent} presenças
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="aspect-auto h-40 w-full md:h-52" config={chartConfig}>
          <BarChart accessibilityLayer data={chartRows}>
            <XAxis
              axisLine={false}
              dataKey="day"
              interval={0}
              tickFormatter={(value) => String(value)}
              tickLine={false}
              tickMargin={10}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
            <Bar dataKey="present" fill="var(--color-present)" shape={<CustomGradientBar />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </DashboardCard>
  );
}
