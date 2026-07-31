import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ScheduleOccurrence } from "@tatamiq/contracts";
import { Clock01Icon, UserMultiple02Icon } from "hugeicons-react";
import { api } from "@/api";
import { useAppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { academyQueryKey } from "@/lib/academy-query-keys";
import { formatAttendanceSummary } from "../classes/attendance-summary";
import { fmtMinutes, localStartMinutes } from "./schedule-calendar-layout";

export function ScheduleOccurrenceDetail(props: {
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
            {occurrence.tags.map((tag) => (
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

export function useScheduleOccurrenceMutation() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
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
        const { error } = await api.POST(endpoint, {
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
    onSuccess: async () => invalidateSchedule(queryClient, activeAcademy.id),
  });
}

export function useStartClassMutation() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
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
      await invalidateSchedule(queryClient, activeAcademy.id);
      if (data?.id) void navigate({ to: `/classes/${data.id}` });
    },
  });
}

export function useDeleteAdHocMutation(onSuccess: () => void) {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/schedule/ad-hoc-classes/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error("Não foi possível excluir a aula avulsa.");
    },
    onSuccess: async () => {
      await invalidateSchedule(queryClient, activeAcademy.id);
      onSuccess();
    },
  });
}

export async function invalidateSchedule(
  qc: ReturnType<typeof useQueryClient>,
  academyId: string | null | undefined,
) {
  await qc.invalidateQueries({ queryKey: academyQueryKey(academyId, "schedule") });
  await qc.invalidateQueries({ queryKey: academyQueryKey(academyId, "classes") });
}

function formatDayLong(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
