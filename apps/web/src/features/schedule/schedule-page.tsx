import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ClassGroup, ScheduleOccurrence } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import { Calendar03Icon, PlusSignIcon } from "hugeicons-react";
import { type FormEvent, useState } from "react";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../../components/ui/drawer";
import { formatAttendanceSummary } from "../classes/attendance-summary";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
type CreateAdHocPayload = components["schemas"]["CreateAdHocClassDto"];

type AdHocFormState = {
  classGroupId: string;
  scheduledStartAt: string;
  durationMinutes: string;
};

export function SchedulePage() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(getMondayWeekStart(new Date()));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<AdHocFormState>({
    classGroupId: "",
    scheduledStartAt: "",
    durationMinutes: "60",
  });
  const [error, setError] = useState<string | null>(null);

  const scheduleQuery = useQuery({
    queryKey: ["schedule", "week", weekStart],
    queryFn: async () => {
      const { data, error } = await api.GET("/schedule/week", { params: { query: { weekStart } } });
      if (error) throw new Error("Não foi possível carregar a agenda.");
      return data;
    },
  });

  const classGroupsQuery = useQuery({
    queryKey: ["class-groups", "active", "for-schedule"],
    queryFn: async () => {
      const { data, error } = await api.GET("/class-groups", {
        params: { query: { status: "active" } },
      });
      if (error) throw new Error("Não foi possível carregar turmas.");
      return data.classGroups;
    },
  });

  const createAdHocMutation = useMutation({
    mutationFn: async (payload: CreateAdHocPayload) => {
      const { error } = await api.POST("/schedule/ad-hoc-classes", { body: payload });
      if (error) throw new Error("Não foi possível criar a aula avulsa.");
    },
    onSuccess: async () => {
      await invalidateSchedule(queryClient);
      setIsFormOpen(false);
      setError(null);
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error ? mutationError.message : "Erro ao criar aula avulsa.",
      ),
  });

  const occurrenceMutation = useScheduleOccurrenceMutation();
  const startClassMutation = useStartClassMutation();
  const days = scheduleQuery.data?.days ?? [];
  const hasOccurrences = days.some((day) => day.occurrences.length > 0);

  function moveWeek(delta: number) {
    setWeekStart(addDays(weekStart, delta * 7));
  }

  function openAdHocForm() {
    const firstClassGroup = classGroupsQuery.data?.[0];
    setForm({
      classGroupId: firstClassGroup?.id ?? "",
      scheduledStartAt: toDatetimeLocal(new Date()),
      durationMinutes: firstClassGroup ? String(firstClassGroup.defaultDurationMinutes) : "60",
    });
    setError(null);
    setIsFormOpen(true);
  }

  function submitAdHoc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: CreateAdHocPayload = {
      classGroupId: form.classGroupId,
      durationMinutes: Number(form.durationMinutes),
    };
    if (form.scheduledStartAt)
      payload.scheduledStartAt = new Date(form.scheduledStartAt).toISOString();
    createAdHocMutation.mutate(payload);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl md:p-8">
        <Badge variant="muted">Agenda V0</Badge>
        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Agenda</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Visualize recorrências, aulas avulsas e cancelamentos sem iniciar chamada ainda.
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
            <Button variant="secondary" onClick={() => moveWeek(1)}>
              Próxima semana
            </Button>
            <Button onClick={openAdHocForm}>
              <PlusSignIcon className="size-4" /> Aula avulsa
            </Button>
          </div>
        </div>
      </section>

      <Drawer
        direction="right"
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) setIsFormOpen(false);
        }}
      >
        <DrawerContent>
          <AdHocForm
            classGroups={classGroupsQuery.data ?? []}
            error={error}
            form={form}
            isSaving={createAdHocMutation.isPending}
            setForm={setForm}
            onSubmit={submitAdHoc}
          />
        </DrawerContent>
      </Drawer>

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
                      <OccurrenceCard
                        key={occurrence.id}
                        occurrence={occurrence}
                        onAction={(action) => occurrenceMutation.mutate({ occurrence, action })}
                        onStart={() => startClassMutation.mutate(occurrence)}
                        isStarting={startClassMutation.isPending}
                      />
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

function useScheduleOccurrenceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      occurrence,
      action,
    }: {
      occurrence: ScheduleOccurrence;
      action: "cancel" | "reactivate";
    }) => {
      if (occurrence.source === "ad_hoc" && occurrence.classSessionId) {
        const endpoint =
          action === "cancel"
            ? "/schedule/ad-hoc-classes/{id}/cancel"
            : "/schedule/ad-hoc-classes/{id}/reactivate";
        if (endpoint === "/schedule/ad-hoc-classes/{id}/cancel") {
          const { error } = await api.POST("/schedule/ad-hoc-classes/{id}/cancel", {
            params: { path: { id: occurrence.classSessionId } },
          });
          if (error) throw new Error("Não foi possível atualizar a aula avulsa.");
          return;
        }
        const { error } = await api.POST("/schedule/ad-hoc-classes/{id}/reactivate", {
          params: { path: { id: occurrence.classSessionId } },
        });
        if (error) throw new Error("Não foi possível atualizar a aula avulsa.");
        return;
      }

      if (occurrence.source === "recurring" && action === "cancel" && occurrence.scheduleId) {
        const { error } = await api.POST("/schedule/recurring-cancellations", {
          body: {
            classGroupId: occurrence.classGroupId,
            scheduleId: occurrence.scheduleId,
            occurrenceDate: occurrence.scheduledDate,
          },
        });
        if (error) throw new Error("Não foi possível cancelar a aula recorrente.");
        return;
      }

      if (
        occurrence.source === "recurring" &&
        action === "reactivate" &&
        occurrence.cancellationId
      ) {
        const { error } = await api.POST("/schedule/recurring-cancellations/{id}/revert", {
          params: { path: { id: occurrence.cancellationId } },
        });
        if (error) throw new Error("Não foi possível reverter o cancelamento.");
      }
    },
    onSuccess: async () => invalidateSchedule(queryClient),
  });
}

function useStartClassMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (occurrence: ScheduleOccurrence) => {
      if (occurrence.source === "recurring" && occurrence.scheduleId) {
        const { data, error } = await api.POST("/classes/start-recurring", {
          body: {
            classGroupId: occurrence.classGroupId,
            scheduleId: occurrence.scheduleId,
            scheduledDate: occurrence.scheduledDate,
          },
        });
        if (error) throw new Error("Não foi possível iniciar a aula recorrente.");
        return data;
      }

      if (occurrence.source === "ad_hoc" && occurrence.classSessionId) {
        const { data, error } = await api.POST("/classes/{id}/start-ad-hoc", {
          params: { path: { id: occurrence.classSessionId } },
        });
        if (error) throw new Error("Não foi possível iniciar a aula avulsa.");
        return data;
      }

      throw new Error("Ocorrência inválida para iniciar aula.");
    },
    onSuccess: async (data) => {
      await invalidateSchedule(queryClient);
      if (data?.id) void navigate({ to: `/classes/${data.id}` });
    },
  });
}

function AdHocForm(props: {
  classGroups: ClassGroup[];
  error: string | null;
  form: AdHocFormState;
  isSaving: boolean;
  setForm: React.Dispatch<React.SetStateAction<AdHocFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="flex h-full flex-col" onSubmit={props.onSubmit}>
      <DrawerHeader>
        <DrawerTitle>Nova aula avulsa</DrawerTitle>
        <DrawerDescription>Selecione a turma, data e duração da aula.</DrawerDescription>
      </DrawerHeader>
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4">
        <label className="space-y-2 text-sm font-medium">
          <span>Turma</span>
          <select
            value={props.form.classGroupId}
            onChange={(event) =>
              props.setForm((current) => ({ ...current, classGroupId: event.target.value }))
            }
            className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {props.classGroups.map((classGroup) => (
              <option key={classGroup.id} value={classGroup.id}>
                {classGroup.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>Data e hora</span>
          <input
            type="datetime-local"
            value={props.form.scheduledStartAt}
            onChange={(event) =>
              props.setForm((current) => ({ ...current, scheduledStartAt: event.target.value }))
            }
            className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>Duração (min)</span>
          <input
            type="number"
            min="15"
            max="300"
            value={props.form.durationMinutes}
            onChange={(event) =>
              props.setForm((current) => ({ ...current, durationMinutes: event.target.value }))
            }
            className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        {props.error ? <p className="text-sm text-destructive">{props.error}</p> : null}
      </div>
      <DrawerFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            props.setForm((current) => ({
              ...current,
              scheduledStartAt: toDatetimeLocal(new Date()),
            }))
          }
        >
          Usar agora
        </Button>
        <DrawerClose asChild>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </DrawerClose>
        <Button type="submit" disabled={props.isSaving || props.classGroups.length === 0}>
          {props.isSaving ? "Salvando..." : "Salvar aula"}
        </Button>
      </DrawerFooter>
    </form>
  );
}

export function TodayScheduleCard() {
  const todayQuery = useQuery({ queryKey: ["schedule", "today"], queryFn: fetchTodaySchedule });
  const occurrences =
    todayQuery.data?.occurrences.filter((occurrence) => occurrence.status === "scheduled") ?? [];
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
          <Badge variant="default">Próxima aula às {nextOccurrence.startTime}</Badge>
        ) : (
          <Badge variant="muted">Nenhuma aula hoje</Badge>
        )}
      </CardContent>
    </Card>
  );
}

export function TodayRoutineCard() {
  const todayQuery = useQuery({ queryKey: ["schedule", "today"], queryFn: fetchTodaySchedule });
  const activeQuery = useQuery({
    queryKey: ["classes", "active"],
    queryFn: async () => {
      const { data } = await api.GET("/classes/active");
      return data ?? null;
    },
  });
  const activeClass = activeQuery.data;
  const occurrence = todayQuery.data?.occurrences.find((item) => item.status === "scheduled");

  if (activeClass) {
    return (
      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">Aula em andamento</p>
          <CardTitle>{activeClass.classGroupName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Calendar03Icon className="size-5 text-primary" />
              <span>{activeClass.durationMinutes}min</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Aula ativa com QR Code disponível para chamada.
            </p>
            <a
              href={`/classes/${activeClass.id}`}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Continuar aula
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">Rotina de hoje</p>
        <CardTitle>{occurrence ? "Próxima aula agendada" : "Sem aula hoje"}</CardTitle>
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
                Inicie esta aula na agenda para abrir o QR Code de chamada.
              </p>
            </>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Crie horários em Turmas ou uma aula avulsa para montar a agenda de hoje.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OccurrenceCard(props: {
  occurrence: ScheduleOccurrence;
  onAction: (action: "cancel" | "reactivate") => void;
  onStart: () => void;
  isStarting: boolean;
}) {
  const occurrence = props.occurrence;
  const isCancelled = occurrence.status === "cancelled";
  const isActive = occurrence.status === "active";
  const isEnded = occurrence.status === "ended";
  const canStart = occurrence.status === "scheduled";
  return (
    <article
      className={`rounded-2xl border p-3 ${isCancelled ? "border-destructive/40 bg-destructive/5 opacity-75" : isActive ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
      data-testid="schedule-occurrence-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{occurrence.startTime}</p>
          <h3 className="mt-1 font-medium">{occurrence.classGroupName}</h3>
        </div>
        <Badge
          variant={
            isCancelled
              ? "muted"
              : isActive
                ? "default"
                : isEnded
                  ? "muted"
                  : occurrence.source === "ad_hoc"
                    ? "warning"
                    : "default"
          }
        >
          {isCancelled
            ? "Cancelada"
            : isActive
              ? "Em andamento"
              : isEnded
                ? "Encerrada"
                : occurrence.source === "ad_hoc"
                  ? "Avulsa"
                  : "Recorrente"}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {occurrence.durationMinutes}min ·{" "}
        {occurrence.attendanceCount != null
          ? formatAttendanceSummary(occurrence.attendanceCount, occurrence.studentCount)
          : `${occurrence.studentCount} aluno(s) da turma`}
      </p>
      {occurrence.tags.length > 0 ? (
        <p className="mt-2 text-xs text-primary">
          {occurrence.tags.map((tag) => `#${tag}`).join(" ")}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        {canStart ? (
          <Button className="flex-1" size="sm" disabled={props.isStarting} onClick={props.onStart}>
            {props.isStarting ? "Iniciando..." : "Iniciar aula"}
          </Button>
        ) : null}
        {(isActive || isEnded) && occurrence.classSessionId ? (
          <Button
            className="flex-1"
            size="sm"
            variant={isEnded ? "secondary" : "default"}
            onClick={() => {
              window.location.href = `/classes/${occurrence.classSessionId}`;
            }}
          >
            {isEnded ? "Ver presenças" : "Ver aula"}
          </Button>
        ) : null}
        {canStart || isCancelled ? (
          <Button
            className="flex-1"
            size="sm"
            variant="secondary"
            onClick={() => props.onAction(isCancelled ? "reactivate" : "cancel")}
          >
            {isCancelled ? "Reativar" : "Cancelar"}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function EmptySchedule() {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border p-10 text-center">
      <h2 className="font-semibold">Nenhuma aula nesta semana</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Cadastre turmas ativas ou aulas avulsas para preencher a agenda.
      </p>
    </div>
  );
}

async function fetchTodaySchedule() {
  const { data, error } = await api.GET("/schedule/today");
  if (error) throw new Error("Não foi possível carregar aulas de hoje.");
  return data;
}

async function invalidateSchedule(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: ["schedule"] });
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

function toDatetimeLocal(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}
