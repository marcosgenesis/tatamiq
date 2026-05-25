import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight01Icon } from "hugeicons-react";
import { api } from "@/api";
import { DashboardCard } from "@/components/dashboard-card";
import { formatCurrency } from "@/components/formater";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabels: Record<string, string> = {
  open: "Em aberto",
  under_review: "Verificando",
  paid: "Pago",
  waived: "Dispensado",
};

export function DashboardInvoices() {
  const feesQuery = useQuery({
    queryKey: ["monthly-fees", "dashboard-recent"],
    queryFn: async () => {
      const { data, error } = await api.GET("/monthly-fees", { params: { query: {} } });
      if (error) return null;
      return data;
    },
  });

  const recentFees = (feesQuery.data?.fees ?? []).filter((f) => f.status !== "waived").slice(0, 5);

  return (
    <DashboardCard className="relative gap-0 md:col-span-2">
      <CardHeader className="border-b">
        <CardTitle className="text-base">Mensalidades recentes</CardTitle>
        <CardDescription>Situação e valores das últimas cobranças.</CardDescription>
      </CardHeader>
      <CardContent className="mask-b-from-50% mask-b-to-100% px-0">
        <Table>
          <TableCaption className="sr-only">Mensalidades com aluno, valor e status.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="ps-6">Aluno</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pe-6 text-right tabular-nums">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentFees.map((fee) => (
              <TableRow className="h-12" key={fee.id}>
                <TableCell className="max-w-40 truncate ps-6 font-medium">
                  {fee.studentName}
                </TableCell>
                <TableCell>
                  <Badge variant={fee.isOverdue ? "warning" : "muted"}>
                    {fee.isOverdue ? "Atrasado" : (statusLabels[fee.status] ?? fee.status)}
                  </Badge>
                </TableCell>
                <TableCell className="pe-6 text-right tabular-nums">
                  {formatCurrency(fee.amountInCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <div className="mask-t-from-30% absolute inset-x-0 bottom-0 flex h-1/5 items-center justify-center bg-background">
        <Button className="relative" variant="ghost">
          <Link to="/monthly-fees">
            Ver todas
            <ArrowRight01Icon aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </DashboardCard>
  );
}
