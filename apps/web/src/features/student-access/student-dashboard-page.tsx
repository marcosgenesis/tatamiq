import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function StudentDashboardPage() {
  const query = useQuery({
    queryKey: ["student", "me"],
    queryFn: async () => {
      const { data, error } = await api.GET("/student/me");
      if (error) throw new Error("Não foi possível carregar sua área de aluno.");
      return data;
    },
  });

  if (query.isLoading) {
    return <main className="p-6 text-sm text-muted-foreground">Carregando área do aluno...</main>;
  }

  if (query.isError || !query.data) {
    return <main className="p-6 text-sm text-destructive">Acesso de aluno indisponível.</main>;
  }

  const data = query.data;

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl">
          <Badge variant={data.student.status === "active" ? "default" : "muted"}>
            {data.student.status === "active" ? "Aluno ativo" : "Aluno inativo"}
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Olá, {data.student.name}</h1>
          <p className="mt-2 text-muted-foreground">{data.academy.name}</p>
          {data.student.readOnly ? (
            <p className="mt-4 rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              Seu acesso está somente leitura porque seu cadastro está inativo.
            </p>
          ) : null}
        </section>

        <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Minhas turmas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.classGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma turma vinculada.</p>
              ) : (
                data.classGroups.map((group) => (
                  <div key={group.id} className="rounded-2xl border border-border p-3 text-sm">
                    {group.name}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximas aulas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.upcomingClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma aula nos próximos 7 dias.</p>
              ) : (
                data.upcomingClasses.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <strong>{item.classGroupName}</strong>
                      {item.status === "cancelled" ? (
                        <Badge variant="muted">Cancelada</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(item.scheduledStartAt)} · {item.durationMinutes} min
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
