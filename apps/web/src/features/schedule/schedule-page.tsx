import type { ScheduleOccurrence } from "@appdosensei/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ptBR } from "date-fns/locale";
import { Calendar03Icon, PlusSignIcon } from "hugeicons-react";
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
import { Drawer, DrawerContent } from "../../components/ui/drawer";
import { useIsMobile } from "../../hooks/use-mobile";
import { academyQueryKey } from "../../lib/academy-query-keys";
import { AdHocClassForm, type AdHocFormState } from "./ad-hoc-class-form";
import { type CreateAdHocPayload, createAdHocClass } from "./schedule-api";
import { fmtMinutes, localStartMinutes } from "./schedule-calendar-layout";
import { ScheduleMobile } from "./schedule-mobile";
import {
  invalidateSchedule,
  ScheduleOccurrenceDetail,
  useDeleteAdHocMutation,
  useScheduleOccurrenceMutation,
  useStartClassMutation,
} from "./schedule-occurrence-detail";

/* ── types ── */

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
  const isMobile = useIsMobile();
  if (isMobile) return <ScheduleMobile />;
  return <SchedulePageDesktop />;
}

function SchedulePageDesktop() {
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
    mutationFn: createAdHocClass,
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
            <ScheduleOccurrenceDetail
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
                if (selectedOccurrence.classSessionId) {
                  deleteAdHocMutation.mutate(selectedOccurrence.classSessionId);
                }
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

function getMondayWeekStart(date: Date): string {
  const v = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = v.getUTCDay();
  v.setUTCDate(v.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return v.toISOString().slice(0, 10);
}

function toDatetimeLocal(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
