import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { DashboardCard } from "@/components/dashboard-card";
import { formatCurrency } from "@/components/formater";
import { CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardStats() {
  const studentsQuery = useQuery({
    queryKey: ["students", "all"],
    queryFn: async () => {
      const { data, error } = await api.GET("/students", { params: { query: { status: "all" } } });
      if (error) return null;
      return data;
    },
  });

  const feesQuery = useQuery({
    queryKey: ["monthly-fees", "dashboard-summary"],
    queryFn: async () => {
      const { data, error } = await api.GET("/monthly-fees", { params: { query: {} } });
      if (error) return null;
      return data;
    },
  });

  const todayQuery = useQuery({
    queryKey: ["schedule", "today"],
    queryFn: async () => {
      const { data, error } = await api.GET("/schedule/today");
      if (error) return null;
      return data;
    },
  });

  const studentsSummary = studentsQuery.data?.summary;
  const feesSummary = feesQuery.data?.summary;
  const todayClasses = todayQuery.data?.occurrences?.filter((o) => o.status !== "cancelled") ?? [];

  const totalPaidCents =
    feesQuery.data?.fees
      ?.filter((f) => f.status === "paid")
      .reduce((sum, f) => sum + f.amountInCents, 0) ?? 0;

  const stats = [
    {
      label: "Alunos ativos",
      value: String(studentsSummary?.active ?? "—"),
      sub: `${studentsSummary?.inactive ?? 0} inativos`,
    },
    {
      label: "Aulas hoje",
      value: String(todayClasses.length),
      sub: `${todayClasses.filter((o) => o.status === "ended").length} finalizadas`,
    },
    {
      label: "Em verificação",
      value: String(feesSummary?.underReview ?? "—"),
      sub: `${feesSummary?.overdue ?? 0} atrasadas`,
    },
    {
      label: "Recebido no mês",
      value: formatCurrency(totalPaidCents),
      sub: `${feesSummary?.paid ?? 0} mensalidades`,
    },
  ];

  return (
    <>
      {stats.map((s) => (
        <DashboardCard key={s.label}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-normal text-xs tracking-wide">{s.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-row items-center gap-2">
            <p className="font-semibold text-2xl tabular-nums">{s.value}</p>
          </CardContent>
          <CardFooter className="gap-1 rounded-none bg-background text-xs">
            <span className="text-muted-foreground">{s.sub}</span>
          </CardFooter>
        </DashboardCard>
      ))}
    </>
  );
}
