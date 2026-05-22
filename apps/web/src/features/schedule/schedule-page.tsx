import { useQuery } from "@tanstack/react-query";
import type { ScheduleOccurrence } from "@tatamiq/contracts";
import { Calendar03Icon } from "hugeicons-react";
import { useState } from "react";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function SchedulePage() {
  const [weekStart, setWeekStart] = useState(getMondayWeekStart(new Date()));
  const scheduleQuery = useQuery({
    queryKey: ["schedule", "week", weekStart],
    queryFn: async () => {
      const { data, error } = await api.GET("/schedule/week", {
        params: { query: { weekStart } },
      });
      if (error) throw new Error("Não foi possível carregar a agenda.");
      return data;
    },
  });

  const days = scheduleQuery.data?.days ?? [];
  const hasOccurrences = days.some((day) => day.occurrences.length > 0);

  function moveWeek(delta: number) {
    setWeekStart(addDays(weekStart, delta * 7));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl md:p-8">
        <Badge variant="muted">Agenda V0</Badge>
        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Agenda</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Visualize a semana calculada a partir das turmas ativas e horários recorrentes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => moveWeek(-1)}>
              Semana anterior
            </Button>
            <Button
              variant="secondary"
              onClick={() => setWeekStart(getMondayWeekStart(new Date()))}
            >
              Semana atual
            </Button>
            <Button onClick={() => moveWeek(1)}>Próxima semana</Button>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{weekRangeLabel(weekStart)}</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduleQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando agenda...</p>
          ) : null}
          {scheduleQuery.isError ? (
            <p className="text-sm text-destructive">Não foi possível carregar a agenda.</p>
          ) : null}
          {!scheduleQuery.isLoading && !hasOccurrences ? <EmptySchedule /> : null}
          {days.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-7">
              {days.map((day) => (
                <div
                  key={day.date}
                  className="rounded-3xl border border-border bg-background/50 p-3"
                >
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em]">
                      {weekdays[day.weekday]}
                    </p>
                    <h2 className="mt-1 font-semibold">{formatDay(day.date)}</h2>
                  </div>
                  <div className="space-y-2">
                    {day.occurrences.map((occurrence) => (
                      <OccurrenceCard key={occurrence.id} occurrence={occurrence} />
                    ))}
                    {day.occurrences.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                        Sem aulas
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function TodayScheduleCard() {
  const todayQuery = useQuery({
    queryKey: ["schedule", "today"],
    queryFn: async () => {
      const { data, error } = await api.GET("/schedule/today");
      if (error) throw new Error("Não foi possível carregar aulas de hoje.");
      return data;
    },
  });

  const occurrences = todayQuery.data?.occurrences ?? [];
  const nextOccurrence = occurrences[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Aulas de hoje</p>
            <CardTitle className="text-4xl">{occurrences.length}</CardTitle>
          </div>
          <div className="grid size-11 place-items-center rounded-2xl border border-border bg-muted text-primary">
            <Calendar03Icon className="size-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {nextOccurrence ? (
          <Badge variant="default">Próxima turma às {nextOccurrence.startTime}</Badge>
        ) : (
          <Badge variant="muted">Nenhuma aula recorrente hoje</Badge>
        )}
      </CardContent>
    </Card>
  );
}

export function TodayRoutineCard() {
  const todayQuery = useQuery({
    queryKey: ["schedule", "today"],
    queryFn: async () => {
      const { data, error } = await api.GET("/schedule/today");
      if (error) throw new Error("Não foi possível carregar aulas de hoje.");
      return data;
    },
  });

  const occurrence = todayQuery.data?.occurrences[0];

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">Rotina de hoje</p>
        <CardTitle>
          {occurrence ? "Próxima turma recorrente" : "Sem turma recorrente hoje"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-border bg-background/45 p-5">
          {occurrence ? (
            <>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Calendar03Icon className="size-5 text-primary" />
                <span>
                  {occurrence.startTime} · {occurrence.durationMinutes}min ·{" "}
                  {occurrence.studentCount} aluno(s)
                </span>
              </div>
              <p className="mt-3 text-lg font-medium">{occurrence.classGroupName}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Na próxima fatia, o instrutor poderá iniciar a chamada desta aula e abrir o QR Code.
              </p>
            </>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Crie horários em Turmas para montar a agenda de hoje.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OccurrenceCard(props: { occurrence: ScheduleOccurrence }) {
  const occurrence = props.occurrence;
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-sm font-semibold">{occurrence.startTime}</p>
      <h3 className="mt-1 font-medium">{occurrence.classGroupName}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {occurrence.durationMinutes}min · {occurrence.studentCount} aluno(s)
      </p>
      {occurrence.tags.length > 0 ? (
        <p className="mt-2 text-xs text-primary">
          {occurrence.tags.map((tag) => `#${tag}`).join(" ")}
        </p>
      ) : null}
    </div>
  );
}

function EmptySchedule() {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border p-10 text-center">
      <h2 className="font-semibold">Nenhuma aula recorrente nesta semana</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Cadastre turmas ativas com horários semanais para preencher a agenda.
      </p>
    </div>
  );
}

function getMondayWeekStart(date: Date): string {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = value.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setUTCDate(value.getUTCDate() + diff);
  return value.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function weekRangeLabel(weekStart: string): string {
  return `${formatDay(weekStart)} — ${formatDay(addDays(weekStart, 6))}`;
}

function formatDay(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
