import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function StudentScheduleSection() {
  const query = useQuery({
    queryKey: ["student", "schedule"],
    queryFn: async () => {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { data, error } = await (api.GET as any)("/student/schedule");
      if (error) throw new Error("Não foi possível carregar a agenda.");
      return data as {
        days: Array<{
          date: string;
          weekday: string;
          classes: Array<{
            id: string;
            classGroupName: string;
            scheduledStartAt: string;
            durationMinutes: number;
            status: string;
            source: string;
          }>;
        }>;
      };
    },
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando agenda...</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-sm text-destructive">Erro ao carregar agenda.</p>;
  }

  const { days } = query.data;

  if (days.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhuma aula programada nos próximos 7 dias.</p>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((day) => (
        <Card key={day.date}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base capitalize">
              {day.weekday} — {formatDate(day.date)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {day.classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem aulas neste dia.</p>
            ) : (
              day.classes.map((cls) => (
                <div
                  key={cls.id}
                  className={`flex min-h-16 items-start justify-between gap-3 rounded-2xl border border-border p-4 text-sm ${
                    cls.status === "cancelled" ? "opacity-60" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <strong className="break-words">{cls.classGroupName}</strong>
                    <p className="text-muted-foreground">
                      {formatTime(cls.scheduledStartAt)} · {cls.durationMinutes} min
                    </p>
                  </div>
                  {cls.status === "cancelled" && <Badge variant="muted">Cancelada</Badge>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(value));
}
