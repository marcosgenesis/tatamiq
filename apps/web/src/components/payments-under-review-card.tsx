import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function PaymentsUnderReviewCard() {
  const query = useQuery({
    queryKey: ["dashboard", "payments-under-review"],
    queryFn: async () => {
      const { data, error } = await api.GET("/monthly-fees", {
        params: { query: { status: "under_review" } },
      });
      if (error) throw new Error("Não foi possível carregar pagamentos em verificação.");
      return data.summary.underReview;
    },
  });

  return (
    <Card className="rounded-none border-0 shadow-none">
      <CardHeader>
        <CardTitle>Pagamentos em verificação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-semibold text-4xl tabular-nums">{query.data ?? 0}</p>
        <button
          type="button"
          className="text-sm text-primary underline-offset-4 hover:underline"
          onClick={() => {
            window.location.href = "/monthly-fees?status=under_review";
          }}
        >
          Abrir fila de verificação
        </button>
      </CardContent>
    </Card>
  );
}
