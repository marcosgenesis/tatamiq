import { useQuery } from "@tanstack/react-query";
import type { StudentScheduleClass, StudentScheduleResponse } from "@tatamiq/contracts";
import { Calendar03Icon } from "hugeicons-react";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { authClient } from "../../lib/auth-client";
import { studentQueryKey } from "../../lib/session-query-keys";
import { cn } from "../../lib/utils";
import { StudentEmptyState } from "./components/student-empty-state";

type Day = StudentScheduleResponse["days"][number];

export function StudentScheduleSection() {
  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id;
  const query = useQuery({
    queryKey: studentQueryKey(sessionUserId, "schedule"),
    queryFn: async () => {
      const { data, error } = await api.GET("/student/schedule");
      if (error || !data) throw new Error("Não foi possível carregar a agenda.");
      return data satisfies StudentScheduleResponse;
    },
    enabled: !!sessionUserId,
  });

  const days = query.data?.days ?? [];
  const withClasses = days.filter((d) => d.classes.length > 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[1.55rem] font-bold tracking-tight">Agenda</h1>
        <p className="text-sm font-medium text-muted-foreground">Próximos 7 dias</p>
      </header>

      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Erro ao carregar a agenda.</p>
      ) : days.length > 0 ? (
        <div className="flex gap-1.5">
          {days.slice(0, 7).map((day, i) => (
            <WeekPill key={day.date} day={day} active={i === 0} />
          ))}
        </div>
      ) : null}

      {!query.isLoading && !query.isError && withClasses.length === 0 ? (
        <StudentEmptyState
          icon={Calendar03Icon}
          title="Nenhuma aula por enquanto"
          description="Quando você entrar em uma turma, as aulas dos próximos 7 dias aparecem aqui."
        />
      ) : null}

      {withClasses.map((day, i) => (
        <section key={day.date} className="space-y-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight">{dayHeading(day.date, i)}</h2>
            <span className="text-xs font-medium text-muted-foreground">· {longDay(day.date)}</span>
          </div>
          {day.classes.map((cls) => (
            <ClassRow key={cls.id} cls={cls} />
          ))}
        </section>
      ))}
    </div>
  );
}

function WeekPill({ day, active }: { day: Day; active: boolean }) {
  const d = new Date(`${day.date.slice(0, 10)}T12:00:00`);
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5",
        active ? "bg-primary text-primary-foreground" : "border border-border bg-card",
      )}
    >
      <span
        className={cn(
          "text-[0.65rem] font-semibold",
          active ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {SHORT[d.getDay()]}
      </span>
      <span className="text-[0.95rem] font-bold">{d.getDate()}</span>
    </div>
  );
}

function ClassRow({ cls }: { cls: StudentScheduleClass }) {
  const cancelled = cls.status === "cancelled";
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-2xl border border-border p-3.5",
        cancelled ? "bg-muted/40" : "bg-card",
      )}
    >
      <div className="w-14 shrink-0">
        <p
          className={cn(
            "text-[0.95rem] font-bold leading-tight",
            cancelled && "text-muted-foreground",
          )}
        >
          {time(cls.scheduledStartAt)}
        </p>
        <p className="text-[0.7rem] font-medium text-muted-foreground">{cls.durationMinutes} min</p>
      </div>
      <span className="h-9 w-px bg-border" />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            cancelled && "text-muted-foreground line-through",
          )}
        >
          {cls.classGroupName}
        </p>
      </div>
      {cancelled ? <Badge variant="destructive-light">Cancelada</Badge> : null}
    </div>
  );
}

const SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function time(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

function dayHeading(dateIso: string, index: number): string {
  if (index === 0) return "Hoje";
  if (index === 1) return "Amanhã";
  const d = new Date(`${dateIso.slice(0, 10)}T12:00:00`);
  const wd = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(d);
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

function longDay(dateIso: string): string {
  const d = new Date(`${dateIso.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(d);
}
