import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ScheduleOccurrence } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import { ptBR } from "date-fns/locale";
import { Calendar03Icon, Clock01Icon, PlusSignIcon, UserMultiple02Icon } from "hugeicons-react";
import { type FormEvent, useMemo, useState } from "react";
import { api } from "../../api";
import { useAppShell } from "../../components/app-shell";
import { EventCalendar } from "../../components/reui/event-calendar/event-calendar";
import { EventCalendarContent } from "../../components/reui/event-calendar/event-calendar-content";
import { EventCalendarNav } from "../../components/reui/event-calendar/event-calendar-nav";
import type {
  CalendarEvent,
  EventCalendarOccurrence,
  EventCalendarRangeInfo,
  EventCalendarSlotDraft,
} from "../../components/reui/event-calendar/event-calendar-types";
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
import { academyQueryKey } from "../../lib/academy-query-keys";
import { formatAttendanceSummary } from "../classes/attendance-summary";
import { AdHocClassForm, type AdHocFormState } from "./ad-hoc-class-form";
import { fmtMinutes, localStartMinutes } from "./schedule-calendar-layout";

/* ── types ── */

type CreateAdHocPayload = components["schemas"]["CreateAdHocClassDto"];
type ScheduleDay = { date: string; weekday: number; occurrences: ScheduleOccurrence[] };
type ScheduleEvent = CalendarEvent<ScheduleOccurrence>;

/** Calendar visible window (local hours). Mirrors the previous grid gutter. */
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23;

/** Maps an occurrence status to a CSS color fed to the reui `--ec-event-color` var. */
function eventColor(occ: ScheduleOccurrence): string {
  switch (occ.status) {
    case "active":
      return "var(--color-emerald-500)";
    case "cancelled":
      return "var(--color-rose-500)";
    case "ended":
      return "var(--color-slate-400)";
    default:
      return occ.source === "ad_hoc" ? "var(--color-amber-500)" : "var(--color-primary)";
  }
}

/** Builds the event start instant from the occurrence's local date + time. */
function occurrenceStart(occ: ScheduleOccurrence): Date {
  const [h = 0, m = 0] = occ.startTime.split(":").map(Number);
  const [y = 0, mo = 1, d = 1] = occ.scheduledDate.split("-").map(Number);
  return new Date(y, mo - 1, d, h, m, 0, 0);
}

/* ═══════════════ PAGE ═══════════════ */

export function SchedulePage() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const [weekStart, setWeekStart] = useState(getMondayWeekStart(new Date()));
  const [selectedOccurrence, setSelectedOccurrence] = useState<ScheduleOccurrence | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<AdHocFormState>({
    classGroupId: "",
    scheduledStartAt: "",
    durationMinutes: "60",
  });
  const [error, setError] = useState<string | null>(null);

  const scheduleQuery = useQuery({
    queryKey: academyQueryKey(activeAcademyId, "schedule", "week", weekStart),
    queryFn: async () => {
      const { data, error } = await api.GET("/schedule/week", {
        params: { query: { weekStart } },
      });
      if (error) throw new Error("Não foi possível carregar a agenda.");
      return data;
    },
    enabled: !!activeAcademyId,
  });

  const classGroupsQuery = useQuery({
    queryKey: academyQueryKey(activeAcademyId, "class-groups", "active", "for-schedule"),
    queryFn: async () => {
      const { data, error } = await api.GET("/class-groups", {
        params: { query: { status: "active" } },
      });
      if (error) throw new Error("Não foi possível carregar turmas.");
      return data.classGroups;
    },
    enabled: !!activeAcademyId,
  });

  const createAdHocMutation = useMutation({
    mutationFn: async (payload: CreateAdHocPayload) => {
      const { error } = await api.POST("/schedule/ad-hoc-classes", { body: payload });
      if (error) throw new Error("Não foi possível criar a aula avulsa.");
    },
    onSuccess: async () => {
      await invalidateSchedule(queryClient, activeAcademyId);
      setIsFormOpen(false);
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Erro ao criar aula avulsa."),
  });

  const occurrenceMutation = useScheduleOccurrenceMutation();
  const startClassMutation = useStartClassMutation();
  const deleteAdHocMutation = useDeleteAdHocMutation(() => setSelectedOccurrence(null));

  const days: ScheduleDay[] = scheduleQuery.data?.days ?? [];

  const events: ScheduleEvent[] = useMemo(() => {
    const all: ScheduleEvent[] = [];
    for (const day of days) {
      for (const occ of day.occurrences) {
        const start = occurrenceStart(occ);
        all.push({
          id: occ.id,
          title: occ.classGroupName,
          start,
          end: new Date(start.getTime() + occ.durationMinutes * 60_000),
          color: eventColor(occ),
          readOnly: true,
          data: occ,
        });
      }
    }
    return all;
  }, [days]);

  function openAdHocForm() {
    const first = classGroupsQuery.data?.[0];
    setForm({
      classGroupId: first?.id ?? "",
      scheduledStartAt: toDatetimeLocal(new Date()),
      durationMinutes: first ? String(first.defaultDurationMinutes) : "60",
    });
    setError(null);
    setIsFormOpen(true);
  }

  function openAdHocFromSlot(slot: EventCalendarSlotDraft) {
    const first = classGroupsQuery.data?.[0];
    const durationMinutes = Math.max(
      15,
      Math.round((slot.end.getTime() - slot.start.getTime()) / 60_000),
    );
    setForm({
      classGroupId: first?.id ?? "",
      scheduledStartAt: toDatetimeLocal(slot.start),
      durationMinutes: String(durationMinutes),
    });
    setError(null);
    setIsFormOpen(true);
  }

  function handleRangeChange(info: EventCalendarRangeInfo) {
    setWeekStart(getLocalDateStr(info.activeRange.start));
  }

  function submitAdHoc(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload: CreateAdHocPayload = {
      classGroupId: form.classGroupId,
      durationMinutes: Number(form.durationMinutes),
    };
    if (form.scheduledStartAt)
      payload.scheduledStartAt = new Date(form.scheduledStartAt).toISOString();
    createAdHocMutation.mutate(payload);
  }

  return (
    <div className="space-y-4 p-6">
      {/* ── header ── */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Agenda</h1>
        <Button onClick={openAdHocForm}>
          <PlusSignIcon className="size-4" />
          Aula avulsa
        </Button>
      </div>

      {/* ── calendar ── */}
      {scheduleQuery.isError ? (
        <div className="flex items-center justify-center rounded-xl border border-border py-32 text-sm text-destructive">
          Não foi possível carregar a agenda.
        </div>
      ) : (
        <EventCalendar<ScheduleOccurrence>
          events={events}
          defaultView="week"
          weekStartsOn={1}
          locale={ptBR}
          dayStartHour={DAY_START_HOUR}
          dayEndHour={DAY_END_HOUR}
          loading={scheduleQuery.isLoading}
          interactions={{ drag: false, resize: false, selectSlot: true }}
          onEventClick={(occurrence: EventCalendarOccurrence<ScheduleOccurrence>) => {
            if (occurrence.event.data) setSelectedOccurrence(occurrence.event.data);
          }}
          onSelectSlot={openAdHocFromSlot}
          onRangeChange={handleRangeChange}
          className="h-[calc(100vh-11rem)] overflow-hidden rounded-xl border border-border"
        >
          <EventCalendarNav />
          <EventCalendarContent />
        </EventCalendar>
      )}

      {/* ── ad-hoc drawer ── */}
      <Drawer
        direction="right"
        open={isFormOpen}
        onOpenChange={(o: boolean) => {
          if (!o) setIsFormOpen(false);
        }}
      >
        <DrawerContent>
          <AdHocClassForm
            classGroups={classGroupsQuery.data ?? []}
            error={error}
            form={form}
            isSaving={createAdHocMutation.isPending}
            setForm={setForm}
            onSubmit={submitAdHoc}
            onUseNow={() =>
              setForm((current) => ({ ...current, scheduledStartAt: toDatetimeLocal(new Date()) }))
            }
          />
        </DrawerContent>
      </Drawer>

      {/* ── detail drawer ── */}
      <Drawer
        direction="right"
        open={!!selectedOccurrence}
        onOpenChange={(o: boolean) => {
          if (!o) setSelectedOccurrence(null);
        }}
      >
        <DrawerContent>
          {selectedOccurrence ? (
            <OccurrenceDetail
              occurrence={selectedOccurrence}
              onAction={(action) => {
                occurrenceMutation.mutate(
                  { occurrence: selectedOccurrence, action },
                  { onSuccess: () => setSelectedOccurrence(null) },
                );
              }}
              onStart={() => {
                startClassMutation.mutate(selectedOccurrence);
                setSelectedOccurrence(null);
              }}
              onDelete={() => {
                if (selectedOccurrence.classSessionId)
                  deleteAdHocMutation.mutate(selectedOccurrence.classSessionId);
              }}
              isStarting={startClassMutation.isPending}
              isDeleting={deleteAdHocMutation.isPending}
            />
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/* ── detail drawer ── */

function OccurrenceDetail(props: {
  occurrence: ScheduleOccurrence;
  onAction: (action: "cancel" | "reactivate") => void;
  onStart: () => void;
  onDelete: () => void;
  isStarting: boolean;
  isDeleting: boolean;
}) {
  const { occurrence } = props;
  const isCancelled = occurrence.status === "cancelled";
  const isActive = occurrence.status === "active";
  const isEnded = occurrence.status === "ended";
  const canStart = occurrence.status === "scheduled";

  return (
    <div className="flex h-full flex-col">
      <DrawerHeader className="pb-2">
        <div className="mb-3">
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
        <DrawerTitle className="font-heading text-xl">{occurrence.classGroupName}</DrawerTitle>
        <DrawerDescription>
          {formatDayLong(occurrence.scheduledDate)} · {fmtMinutes(localStartMinutes(occurrence))}
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex-1 space-y-5 px-4">
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Clock01Icon className="size-3.5" /> Duração
            </span>
            <span className="font-medium tabular-nums">{occurrence.durationMinutes} min</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <UserMultiple02Icon className="size-3.5" /> Alunos
            </span>
            <span className="font-medium tabular-nums">{occurrence.studentCount}</span>
          </div>
          {occurrence.attendanceCount != null ? (
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-muted-foreground">Presença</span>
              <span className="font-medium">
                {formatAttendanceSummary(occurrence.attendanceCount, occurrence.studentCount)}
              </span>
            </div>
          ) : null}
        </div>

        {occurrence.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {occurrence.tags.map((tag: string) => (
              <span
                key={tag}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <DrawerFooter>
        {canStart ? (
          <Button size="lg" disabled={props.isStarting} onClick={props.onStart}>
            {props.isStarting ? "Iniciando..." : "Iniciar aula"}
          </Button>
        ) : null}
        {(isActive || isEnded) && occurrence.classSessionId ? (
          <Button
            size="lg"
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
            size="lg"
            variant="secondary"
            onClick={() => props.onAction(isCancelled ? "reactivate" : "cancel")}
          >
            {isCancelled ? "Reativar aula" : "Cancelar aula"}
          </Button>
        ) : null}
        {occurrence.source === "ad_hoc" && occurrence.classSessionId ? (
          <Button
            size="lg"
            variant="destructive"
            disabled={props.isDeleting}
            onClick={props.onDelete}
          >
            {props.isDeleting ? "Excluindo..." : "Excluir aula"}
          </Button>
        ) : null}
        <DrawerClose asChild>
          <Button variant="secondary">Fechar</Button>
        </DrawerClose>
      </DrawerFooter>
    </div>
  );
}

/* ── mutations ── */

function useScheduleOccurrenceMutation() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  return useMutation({
    mutationFn: async ({
      occurrence,
      action,
    }: {
      occurrence: ScheduleOccurrence;
      action: "cancel" | "reactivate";
    }) => {
      if (occurrence.source === "ad_hoc" && occurrence.classSessionId) {
        if (action === "cancel") {
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
    onSuccess: async () => invalidateSchedule(queryClient, activeAcademyId),
  });
}

function useStartClassMutation() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
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
      await invalidateSchedule(queryClient, activeAcademyId);
      if (data?.id) void navigate({ to: `/classes/${data.id}` });
    },
  });
}

function useDeleteAdHocMutation(onSuccess: () => void) {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/schedule/ad-hoc-classes/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error("Não foi possível excluir a aula avulsa.");
    },
    onSuccess: async () => {
      await invalidateSchedule(queryClient, activeAcademyId);
      onSuccess();
    },
  });
}

/* ── dashboard cards (exports) ── */

export function TodayScheduleCard() {
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const q = useQuery({
    queryKey: academyQueryKey(activeAcademyId, "schedule", "today"),
    queryFn: fetchTodaySchedule,
    enabled: !!activeAcademyId,
  });
  const occs =
    q.data?.occurrences.filter((o: ScheduleOccurrence) => o.status === "scheduled") ?? [];
  const next = occs[0];
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Aulas de hoje</p>
            <CardTitle className="text-4xl">{occs.length}</CardTitle>
          </div>
          <div className="grid size-11 place-items-center rounded-2xl border border-border bg-muted text-primary">
            <Calendar03Icon className="size-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {next ? (
          <Badge variant="default">Próxima aula às {fmtMinutes(localStartMinutes(next))}</Badge>
        ) : (
          <Badge variant="muted">Nenhuma aula hoje</Badge>
        )}
      </CardContent>
    </Card>
  );
}

export function TodayRoutineCard() {
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const tq = useQuery({
    queryKey: academyQueryKey(activeAcademyId, "schedule", "today"),
    queryFn: fetchTodaySchedule,
    enabled: !!activeAcademyId,
  });
  const aq = useQuery({
    queryKey: academyQueryKey(activeAcademyId, "classes", "active"),
    queryFn: async () => {
      const { data } = await api.GET("/classes/active");
      return data ?? null;
    },
    enabled: !!activeAcademyId,
  });
  const active = aq.data;
  const occ = tq.data?.occurrences.find((o: ScheduleOccurrence) => o.status === "scheduled");

  if (active) {
    return (
      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">Aula em andamento</p>
          <CardTitle>{active.classGroupName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Calendar03Icon className="size-5 text-primary" />
              <span>{active.durationMinutes}min</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Aula ativa com QR Code disponível para chamada.
            </p>
            <a
              href={`/classes/${active.id}`}
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
        <CardTitle>{occ ? "Próxima aula agendada" : "Sem aula hoje"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-border bg-background/45 p-5">
          {occ ? (
            <>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Calendar03Icon className="size-5 text-primary" />
                <span>
                  {fmtMinutes(localStartMinutes(occ))} · {occ.durationMinutes}min ·{" "}
                  {occ.studentCount} aluno(s)
                </span>
              </div>
              <p className="mt-3 text-lg font-medium">{occ.classGroupName}</p>
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

/* ── helpers ── */

function getLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchTodaySchedule() {
  const { data, error } = await api.GET("/schedule/today");
  if (error) throw new Error("Não foi possível carregar aulas de hoje.");
  return data;
}

async function invalidateSchedule(
  qc: ReturnType<typeof useQueryClient>,
  academyId: string | null | undefined,
) {
  await qc.invalidateQueries({ queryKey: academyQueryKey(academyId, "schedule") });
  await qc.invalidateQueries({ queryKey: academyQueryKey(academyId, "classes") });
}

function getMondayWeekStart(date: Date): string {
  const v = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = v.getUTCDay();
  v.setUTCDate(v.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return v.toISOString().slice(0, 10);
}

function formatDayLong(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function toDatetimeLocal(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
