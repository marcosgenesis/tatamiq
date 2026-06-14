import { useQuery } from "@tanstack/react-query";
import type { StudentGraduationResponse } from "@tatamiq/contracts";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { toGraduationInput } from "./lib/graduation-response";

export function StudentGraduationSection() {
  const query = useQuery({
    queryKey: ["student", "graduation"],
    queryFn: async () => {
      const { data, error } = await api.GET("/student/graduation");
      if (error || !data) throw new Error("Não foi possível carregar graduação.");
      return data satisfies StudentGraduationResponse;
    },
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando graduação...</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-sm text-destructive">Erro ao carregar graduação.</p>;
  }

  const { currentBelt, currentDegree, promotions } = toGraduationInput(query.data);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Faixa atual</CardTitle>
        </CardHeader>
        <CardContent>
          {currentBelt ? (
            <div className="flex items-center gap-4">
              {currentBelt.path && (
                <img src={currentBelt.path} alt={currentBelt.name} className="h-8 w-auto" />
              )}
              <div>
                <p className="text-lg font-semibold">{currentBelt.name}</p>
                <p className="text-sm text-muted-foreground">
                  {currentDegree} {currentDegree === 1 ? "grau" : "graus"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma faixa registrada.</p>
          )}
        </CardContent>
      </Card>

      {promotions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de promoções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-4 border-l-2 border-border pl-6">
              {promotions.map((promo) => (
                <div key={promo.id} className="relative">
                  <div className="absolute -left-[1.625rem] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  <div className="rounded-2xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <strong className="text-sm">{promo.beltName}</strong>
                      <Badge variant="muted">{promo.degree}° grau</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(promo.promotedAt)}
                    </p>
                    {promo.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">{promo.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(value));
}
