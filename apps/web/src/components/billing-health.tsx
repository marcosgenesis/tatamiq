import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Alert02Icon, ArrowRight01Icon, CheckmarkCircle02Icon } from "hugeicons-react";
import { api } from "@/api";
import { DashboardCard } from "@/components/dashboard-card";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function BillingHealth() {
  const feesQuery = useQuery({
    queryKey: ["monthly-fees", "dashboard-summary"],
    queryFn: async () => {
      const { data, error } = await api.GET("/monthly-fees", { params: { query: {} } });
      if (error) return null;
      return data;
    },
  });

  const summary = feesQuery.data?.summary;
  const hasIssues = (summary?.overdue ?? 0) > 0 || (summary?.underReview ?? 0) > 0;

  return (
    <DashboardCard className="gap-0">
      <CardHeader className="border-b">
        <CardTitle className="text-balance text-base">Saúde financeira</CardTitle>
        <CardDescription className="text-pretty">
          {hasIssues ? (
            <>
              {summary?.overdue ?? 0} atrasadas ·{" "}
              {(summary?.underReview ?? 0) > 0 ? (
                <Link
                  to="/monthly-fees"
                  search={{ status: "under_review" }}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {summary?.underReview ?? 0} em verificação
                </Link>
              ) : (
                "0 em verificação"
              )}
            </>
          ) : (
            "Nenhuma pendência no momento."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex h-full items-center px-0">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {hasIssues ? (
                <Alert02Icon aria-hidden="true" />
              ) : (
                <CheckmarkCircle02Icon aria-hidden="true" />
              )}
            </EmptyMedia>
            <EmptyTitle>{hasIssues ? "Atenção necessária" : "Tudo em dia."}</EmptyTitle>
            <EmptyDescription className="text-xs">
              {hasIssues
                ? "Existem mensalidades que precisam de revisão."
                : "Pagamentos e cobranças estão em dia."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="ghost">
              <Link to="/monthly-fees" className="inline-flex items-center gap-1">
                Ver mensalidades
                <ArrowRight01Icon aria-hidden="true" />
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </DashboardCard>
  );
}
