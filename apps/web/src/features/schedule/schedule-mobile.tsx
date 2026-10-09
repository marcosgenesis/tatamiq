import type { ScheduleOccurrence } from "@appdosensei/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  PlusSignIcon,
  UserMultipleIcon,
} from "hugeicons-react";
import { type FormEvent, useMemo, useState } from "react";
import { api } from "@/api";
import { useAppShell } from "@/components/app-shell";
import {
  ActionButton,
  EmptyState,
  MobileScreen,
  PrimaryPill,
  ScreenHeader,
  StatusPill,
  type StatusTone,
} from "@/components/mobile/mobile-ui";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { academyQueryKey } from "@/lib/academy-query-keys";
import { cn } from "@/lib/utils";
import { AdHocClassForm, type AdHocFormState } from "./ad-hoc-class-form";
import { type CreateAdHocPayload, createAdHocClass } from "./schedule-api";
import {
  ScheduleOccurrenceDetail,
  useDeleteAdHocMutation,
  useScheduleOccurrenceMutation,
  useStartClassMutation,
} from "./schedule-occurrence-detail";

const WEEK_INITIALS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Mon..Sun

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mondayOf(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = c.getDay();
  c.setDate(c.getDate() - day + (day === 0 ? -6 : 1));
  return c;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function toDatetimeLocal(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function timelinePill(status: string): { tone: StatusTone; label: string; dot: boolean } {
  switch (status) {
    case "active":
      return { tone: "primary", label: "Em andamento", dot: true };
    case "ended":
      return { tone: "neutral", label: "Encerrada", dot: false };
    case "cancelled":
      return { tone: "neutral", label: "Cancelada", dot: false };
    default:
      return { tone: "neutral", label: "Agendada", dot: false };
  }
}

export function ScheduleMobile() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const academyId = activeAcademy.id;

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<ScheduleOccurrence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AdHocFormState>({
    classGroupId: "",
    scheduledStartAt: "",
    durationMinutes: "60",
  });

  const weekStart = isoDate(mondayOf(selectedDate));
  const todayIso = isoDate(new Date());
  const selectedIso = isoDate(selectedDate);

  const scheduleQuery = useQuery({
    queryKey: academyQueryKey(academyId, "schedule", "week", weekStart),
    queryFn: async () => {
      const { data, error: err } = await api.GET("/schedule/week", {
        params: { query: { weekStart } },
      });
      if (err) throw new Error("Não foi possível carregar a agenda.");
      return data;
    },
    enabled: !!academyId,
  });

  const classGroupsQuery = useQuery({
    queryKey: academyQueryKey(academyId, "class-groups", "active", "for-schedule"),
    queryFn: async () => {
      const { data, error: err } = await api.GET("/class-groups", {
        params: { query: { status: "active" } },
      });
      if (err) throw new Error("Não foi possível carregar turmas.");
      return data.classGroups;
    },
    enabled: !!academyId,
  });

  const createAdHoc = useMutation({
    mutationFn: createAdHocClass,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: academyQueryKey(academyId, "schedule") });
      setIsFormOpen(false);
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Erro ao criar aula avulsa."),
  });
  const occurrenceMutation = useScheduleOccurrenceMutation();
  const startClassMutation = useStartClassMutation();
  const deleteAdHocMutation = useDeleteAdHocMutation(() => setSelectedOccurrence(null));

  const weekDays = useMemo(() => {
    const monday = mondayOf(selectedDate);
    const byDate = new Map((scheduleQuery.data?.days ?? []).map((d) => [d.date, d]));
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      const iso = isoDate(date);
      return { iso, date, initial: WEEK_INITIALS[i], day: byDate.get(iso) };
    });
  }, [scheduleQuery.data, selectedDate]);

  const dayOccurrences = useMemo(() => {
    const day = weekDays.find((d) => d.iso === selectedIso)?.day;
    return [...(day?.occurrences ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [weekDays, selectedIso]);

  function openAdHoc() {
    const first = classGroupsQuery.data?.[0];
    setForm({
      classGroupId: first?.id ?? "",
      scheduledStartAt: toDatetimeLocal(selectedDate),
      durationMinutes: first ? String(first.defaultDurationMinutes) : "60",
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
    createAdHoc.mutate(payload);
  }

  const dayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit" }).format(
    selectedDate,
  );
  const monthLabel = `${new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(selectedDate)} ${selectedDate.getFullYear()}`;

  return (
    <MobileScreen>
      <ScreenHeader
        title="Agenda"
        action={<ActionButton icon={PlusSignIcon} label="Aula avulsa" onClick={openAdHoc} />}
      />

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, -7))}
          className="grid size-8 place-items-center rounded-lg"
          aria-label="Semana anterior"
        >
          <ArrowLeft01Icon className="size-3.5 text-m-ink-2" strokeWidth={1.8} />
        </button>
        <span className="text-[14px] font-medium text-m-ink first-letter:uppercase">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, 7))}
          className="grid size-8 place-items-center rounded-lg"
          aria-label="Próxima semana"
        >
          <ArrowRight01Icon className="size-3.5 text-m-ink-2" strokeWidth={1.8} />
        </button>
      </div>

      {/* Week strip */}
      <div className="flex gap-1.5">
        {weekDays.map((d) => {
          const selected = d.iso === selectedIso;
          const isToday = d.iso === todayIso;
          return (
            <button
              type="button"
              key={d.iso}
              onClick={() => setSelectedDate(d.date)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg border py-2",
                selected
                  ? "border-primary bg-primary"
                  : isToday
                    ? "border-primary/40 bg-card"
                    : "border-border bg-card",
              )}
            >
              <span
                className={cn("text-[12px]", selected ? "text-primary-foreground" : "text-m-ink-3")}
              >
                {d.initial}
              </span>
              <span
                className={cn(
                  "text-[14px] font-medium tabular-nums",
                  selected ? "text-primary-foreground" : "text-m-ink",
                )}
              >
                {d.date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[14px] font-medium text-m-ink first-letter:uppercase">
        {dayLabel} ·{" "}
        <span className="text-m-ink-2 normal-case">
          {dayOccurrences.length === 0
            ? "sem aulas"
            : `${dayOccurrences.length} ${dayOccurrences.length === 1 ? "aula" : "aulas"}`}
        </span>
      </p>

      {/* Timeline */}
      {scheduleQuery.isLoading ? (
        <p className="px-1 py-8 text-center text-[13px] text-m-ink-3">Carregando agenda...</p>
      ) : dayOccurrences.length === 0 ? (
        <EmptyState
          icon={Calendar03Icon}
          title="Nenhuma aula neste dia"
          description="Nenhuma turma recorrente cai neste dia. Que tal criar uma aula avulsa?"
          action={
            <PrimaryPill icon={PlusSignIcon} onClick={openAdHoc}>
              Aula avulsa
            </PrimaryPill>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {dayOccurrences.map((occ) => {
            const pill = timelinePill(occ.status);
            const isActive = occ.status === "active";
            const isCancelled = occ.status === "cancelled";
            return (
              <button
                type="button"
                key={occ.id}
                onClick={() => setSelectedOccurrence(occ)}
                className="flex items-start gap-3 text-left"
              >
                <div className="flex w-[46px] shrink-0 flex-col pt-0.5">
                  <span
                    className={cn(
                      "text-[14px] font-medium tabular-nums",
                      isCancelled ? "text-m-ink-3" : "text-m-ink",
                    )}
                  >
                    {occ.startTime}
                  </span>
                  <span className="text-[12px] text-m-ink-3">{occ.durationMinutes} min</span>
                </div>
                <div
                  className={cn(
                    "flex flex-1 flex-col gap-2 rounded-2xl border p-3",
                    isActive
                      ? "border-primary-soft-border bg-primary-soft"
                      : "border-border bg-card",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[14px] font-medium",
                        isCancelled ? "text-m-ink-3 line-through" : "text-m-ink",
                      )}
                    >
                      {occ.classGroupName}
                    </span>
                    <StatusPill tone={pill.tone} dot={pill.dot}>
                      {pill.label}
                    </StatusPill>
                  </div>
                  {!isCancelled ? (
                    <div className="flex items-center gap-1.5 text-[12px] text-m-ink-2">
                      <UserMultipleIcon className="size-3.5 text-m-ink-3" strokeWidth={1.8} />
                      {occ.status === "ended"
                        ? `${occ.attendanceCount ?? 0}/${occ.studentCount} presentes`
                        : `${occ.studentCount} alunos`}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Ad-hoc drawer */}
      <Drawer
        direction="right"
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) setIsFormOpen(false);
        }}
      >
        <DrawerContent>
          <AdHocClassForm
            classGroups={classGroupsQuery.data ?? []}
            error={error}
            form={form}
            isSaving={createAdHoc.isPending}
            setForm={setForm}
            onSubmit={submitAdHoc}
            onUseNow={() =>
              setForm((current) => ({ ...current, scheduledStartAt: toDatetimeLocal(new Date()) }))
            }
          />
        </DrawerContent>
      </Drawer>

      {/* Occurrence details and actions */}
      <Drawer
        direction="right"
        open={!!selectedOccurrence}
        onOpenChange={(open) => {
          if (!open) setSelectedOccurrence(null);
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
    </MobileScreen>
  );
}
