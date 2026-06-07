import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ScheduleOccurrence } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import { Calendar03Icon, Clock01Icon, PlusSignIcon, UserMultiple02Icon } from "hugeicons-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
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
import { AdHocClassForm, type AdHocFormState } from "./ad-hoc-class-form";
import {
  eventColorClasses,
  FIRST_HOUR,
  fmtMinutes,
  GRID_HEIGHT,
  getEventPosition,
  HOUR_PX,
  HOURS,
  LAST_HOUR,
  layoutDayEvents,
  localStartMinutes,
  pointerYToMinutes,
  WEEKDAYS_SHORT,
} from "./schedule-calendar-layout";
import "./schedule-calendar.css";

/* ── types ── */

type CreateAdHocPayload = components["schemas"]["CreateAdHocClassDto"];
type ScheduleDay = { date: string; weekday: number; occurrences: ScheduleOccurrence[] };

/* ═══════════════ PAGE ═══════════════ */

export function SchedulePage() {
  const queryClient = useQueryClient();
  const gridRef = useRef<HTMLDivElement>(null);
  const [weekStart, setWeekStart] = useState(getMondayWeekStart(new Date()));
  const [selectedOccurrence, setSelectedOccurrence] = useState<ScheduleOccurrence | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<AdHocFormState>({
    classGroupId: "",
    scheduledStartAt: "",
    durationMinutes: "60",
  });
  const [error, setError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    date: string;
    startMin: number;
    currentMin: number;
  } | null>(null);

  const selection = dragState
    ? {
        date: dragState.date,
        startMin: Math.min(dragState.startMin, dragState.currentMin),
        endMin: Math.max(dragState.startMin, dragState.currentMin) + 15,
      }
    : null;

  const nowMinutes = useNowMinutes();
  const todayStr = getLocalDateStr(new Date());
  const nowTop = ((nowMinutes - FIRST_HOUR * 60) / 60) * HOUR_PX;
  const isNowVisible = nowMinutes >= FIRST_HOUR * 60 && nowMinutes < LAST_HOUR * 60;

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
    onError: (e) => setError(e instanceof Error ? e.message : "Erro ao criar aula avulsa."),
  });

  const occurrenceMutation = useScheduleOccurrenceMutation();
  const startClassMutation = useStartClassMutation();
  const deleteAdHocMutation = useDeleteAdHocMutation(() => setSelectedOccurrence(null));

  const days: ScheduleDay[] = scheduleQuery.data?.days ?? [];

  useEffect(() => {
    if (!gridRef.current || !isNowVisible) return;
    const scrollTo = Math.max(0, nowTop - 180);
    gridRef.current.scrollTo({ top: scrollTo, behavior: "smooth" });
  }, [isNowVisible, nowTop]);

  function moveWeek(delta: number) {
    setWeekStart(addDays(weekStart, delta * 7));
  }

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

  function openAdHocFromSelection(sel: { date: string; startMin: number; endMin: number }) {
    const first = classGroupsQuery.data?.[0];
    const h = String(Math.floor(sel.startMin / 60)).padStart(2, "0");
    const m = String(sel.startMin % 60).padStart(2, "0");
    setForm({
      classGroupId: first?.id ?? "",
      scheduledStartAt: `${sel.date}T${h}:${m}`,
      durationMinutes: String(sel.endMin - sel.startMin),
    });
    setError(null);
    setIsFormOpen(true);
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
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setWeekStart(getMondayWeekStart(new Date()))}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" onClick={() => moveWeek(-1)}>
            ‹
          </Button>
          <Button variant="ghost" size="icon" onClick={() => moveWeek(1)}>
            ›
          </Button>
          <h1 className="font-heading text-xl font-semibold">{weekMonthLabel(weekStart)}</h1>
        </div>

        <Button onClick={openAdHocForm}>
          <PlusSignIcon className="size-4" />
          Aula avulsa
        </Button>
      </div>

      {/* ── calendar ── */}
      <div className="overflow-hidden rounded-xl border border-border">
        {scheduleQuery.isLoading ? (
          <div className="flex items-center justify-center py-32 text-sm text-muted-foreground">
            <div className="mr-3 size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
            Carregando agenda...
          </div>
        ) : scheduleQuery.isError ? (
          <div className="flex items-center justify-center py-32 text-sm text-destructive">
            Não foi possível carregar a agenda.
          </div>
        ) : (
          <>
            {/* day headers */}
            <div className="flex border-b border-border">
              <div className="w-16 shrink-0" />
              {days.map((day) => {
                const isToday = day.date === todayStr;
                return (
                  <div
                    key={day.date}
                    className="flex flex-1 items-center justify-center border-l border-border py-3"
                  >
                    <span
                      className={`text-sm ${isToday ? "font-bold text-foreground" : "text-muted-foreground"}`}
                    >
                      {WEEKDAYS_SHORT[day.weekday]} {day.date.slice(-2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* scrollable grid body */}
            <div
              ref={gridRef}
              className="schedule-grid-scroll overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 14rem)" }}
            >
              <div className="relative flex" style={{ height: `${GRID_HEIGHT}px` }}>
                {/* time gutter */}
                <div className="relative w-16 shrink-0">
                  {HOURS.slice(1).map((h) => (
                    <span
                      key={h}
                      className="absolute right-4 -translate-y-1/2 select-none text-xs tabular-nums text-muted-foreground"
                      style={{ top: `${(h - FIRST_HOUR) * HOUR_PX}px` }}
                    >
                      {String(h).padStart(2, "0")}:00
                    </span>
                  ))}
                </div>

                {/* day columns */}
                <div className="relative flex flex-1">
                  {days.map((day) => {
                    const laid = layoutDayEvents(day.occurrences);
                    return (
                      <div
                        key={day.date}
                        className="relative flex-1 cursor-crosshair border-l border-border select-none"
                        onPointerDown={(e) => {
                          if (
                            e.button !== 0 ||
                            (e.target as HTMLElement).closest(".schedule-event")
                          )
                            return;
                          const el = e.currentTarget as HTMLElement;
                          el.setPointerCapture(e.pointerId);
                          const min = pointerYToMinutes(e.clientY, el);
                          setDragState({ date: day.date, startMin: min, currentMin: min });
                          e.preventDefault();
                        }}
                        onPointerMove={(e) => {
                          if (!dragState || dragState.date !== day.date) return;
                          const min = pointerYToMinutes(e.clientY, e.currentTarget as HTMLElement);
                          setDragState((prev) => (prev ? { ...prev, currentMin: min } : null));
                        }}
                        onPointerUp={(e) => {
                          if (!dragState || dragState.date !== day.date) return;
                          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                          const s = Math.min(dragState.startMin, dragState.currentMin);
                          const end = Math.max(dragState.startMin, dragState.currentMin) + 15;
                          if (end - s >= 15)
                            openAdHocFromSelection({ date: day.date, startMin: s, endMin: end });
                          setDragState(null);
                        }}
                      >
                        {/* hour lines */}
                        {HOURS.map((h) => (
                          <div
                            key={h}
                            className="absolute inset-x-0 border-t border-border"
                            style={{ top: `${(h - FIRST_HOUR) * HOUR_PX}px` }}
                          />
                        ))}

                        {/* drag selection overlay */}
                        {selection && selection.date === day.date ? (
                          <div
                            className="pointer-events-none absolute inset-x-1 z-[5] rounded-md border-2 border-dashed border-primary bg-primary/10"
                            style={{
                              top: `${((selection.startMin - FIRST_HOUR * 60) / 60) * HOUR_PX}px`,
                              height: `${((selection.endMin - selection.startMin) / 60) * HOUR_PX}px`,
                            }}
                          >
                            <div className="flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-primary">
                              <span>
                                {fmtMinutes(selection.startMin)} — {fmtMinutes(selection.endMin)}
                              </span>
                              <span className="font-medium opacity-70">
                                {selection.endMin - selection.startMin}min
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {/* events */}
                        {laid.map(({ occurrence: occ, col, totalCols }) => {
                          const pos = getEventPosition(occ);
                          const w = 100 / totalCols;
                          const l = col * w;
                          return (
                            <button
                              key={occ.id}
                              type="button"
                              className={`schedule-event absolute z-[2] flex flex-col overflow-hidden rounded-md text-left ${eventColorClasses(occ)}`}
                              style={{
                                top: `${pos.top + 1}px`,
                                height: `${pos.height - 2}px`,
                                left: `calc(${l}% + 2px)`,
                                width: `calc(${w}% - 4px)`,
                              }}
                              onClick={() => setSelectedOccurrence(occ)}
                            >
                              <span
                                className={`truncate px-2 pt-1.5 text-[11px] font-semibold leading-tight ${occ.status === "cancelled" ? "line-through opacity-60" : ""}`}
                              >
                                {occ.classGroupName}
                              </span>
                              <span className="truncate px-2 text-[10px] leading-tight opacity-70">
                                {fmtMinutes(localStartMinutes(occ))} - {fmtEndTime(occ)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* now indicator */}
                  {isNowVisible ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                      style={{ top: `${nowTop}px` }}
                    >
                      <div className="size-2 shrink-0 rounded-full bg-red-500" />
                      <div className="h-px flex-1 bg-red-500" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

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

function useDeleteAdHocMutation(onSuccess: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/schedule/ad-hoc-classes/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error("Não foi possível excluir a aula avulsa.");
    },
    onSuccess: async () => {
      await invalidateSchedule(queryClient);
      onSuccess();
    },
  });
}

/* ── dashboard cards (exports) ── */

export function TodayScheduleCard() {
  const q = useQuery({ queryKey: ["schedule", "today"], queryFn: fetchTodaySchedule });
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
  const tq = useQuery({ queryKey: ["schedule", "today"], queryFn: fetchTodaySchedule });
  const aq = useQuery({
    queryKey: ["classes", "active"],
    queryFn: async () => {
      const { data } = await api.GET("/classes/active");
      return data ?? null;
    },
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

function useNowMinutes() {
  const [m, setM] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setM(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return m;
}

function getLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchTodaySchedule() {
  const { data, error } = await api.GET("/schedule/today");
  if (error) throw new Error("Não foi possível carregar aulas de hoje.");
  return data;
}

async function invalidateSchedule(qc: ReturnType<typeof useQueryClient>) {
  await qc.invalidateQueries({ queryKey: ["schedule"] });
}

function getMondayWeekStart(date: Date): string {
  const v = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = v.getUTCDay();
  v.setUTCDate(v.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return v.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const v = new Date(`${date}T00:00:00.000Z`);
  v.setUTCDate(v.getUTCDate() + days);
  return v.toISOString().slice(0, 10);
}

function weekMonthLabel(ws: string): string {
  const start = new Date(`${ws}T00:00:00.000Z`);
  const end = new Date(`${addDays(ws, 6)}T00:00:00.000Z`);
  const fmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  if (start.getUTCMonth() === end.getUTCMonth()) {
    const s = fmt.format(start);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const fmtShort = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
  return `${fmtShort.format(start)} - ${fmt.format(end)}`;
}

function fmtEndTime(occ: ScheduleOccurrence): string {
  const startMin = localStartMinutes(occ);
  return fmtMinutes(startMin + occ.durationMinutes);
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
