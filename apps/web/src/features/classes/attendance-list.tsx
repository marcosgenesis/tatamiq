import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttendanceRosterStudent } from "@tatamiq/contracts";
import { useState } from "react";
import { api } from "../../api";
import { useAppShell } from "../../components/app-shell";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { academyQueryKey } from "../../lib/academy-query-keys";
import { formatAttendanceSummary } from "./attendance-summary";

export function AttendanceList(props: {
  classSessionId: string;
  isActive: boolean;
  refetchInterval: number | false;
}) {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [invalidatingId, setInvalidatingId] = useState<string | null>(null);
  const [invalidationReason, setInvalidationReason] = useState("");

  const rosterQuery = useQuery({
    queryKey: ["classes", props.classSessionId, "attendances"],
    queryFn: async () => {
      const { data, error } = await api.GET("/classes/{classSessionId}/attendances", {
        params: { path: { classSessionId: props.classSessionId } },
      });
      if (error) throw new Error("Não foi possível carregar presenças.");
      return data;
    },
    refetchInterval: props.refetchInterval,
  });

  const allStudentsQuery = useQuery({
    queryKey: academyQueryKey(activeAcademyId, "students", "for-attendance"),
    queryFn: async () => {
      const { data, error } = await api.GET("/students", {
        params: { query: {} },
      });
      if (error) throw new Error("Não foi possível carregar alunos.");
      return data.students;
    },
    enabled: showSearch && !!activeAcademyId,
  });

  const addMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await api.POST("/classes/{classSessionId}/attendances", {
        params: { path: { classSessionId: props.classSessionId } },
        body: { studentId },
      });
      if (error) throw new Error("Não foi possível registrar presença.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["classes", props.classSessionId, "attendances"],
      });
      setShowSearch(false);
      setSearchQuery("");
    },
  });

  const invalidateMutation = useMutation({
    mutationFn: async ({ attendanceId, reason }: { attendanceId: string; reason: string }) => {
      const { error } = await api.POST(
        "/classes/{classSessionId}/attendances/{attendanceId}/invalidate",
        {
          params: {
            path: { classSessionId: props.classSessionId, attendanceId },
          },
          body: { reason },
        },
      );
      if (error) throw new Error("Não foi possível invalidar presença.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["classes", props.classSessionId, "attendances"],
      });
      setInvalidatingId(null);
      setInvalidationReason("");
    },
  });

  const roster = rosterQuery.data?.roster ?? [];
  const summary = rosterQuery.data?.summary;

  const presentStudentIds = new Set(
    roster.filter((r) => r.attendance && !r.attendance.invalidatedAt).map((r) => r.studentId),
  );
  const rosterStudentIds = new Set(roster.map((r) => r.studentId));

  const searchResults =
    showSearch && allStudentsQuery.data
      ? allStudentsQuery.data.filter(
          (s) =>
            !presentStudentIds.has(s.id) &&
            s.status === "active" &&
            s.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>
            Presenças{" "}
            {summary ? (
              <span className="text-muted-foreground font-normal">
                {formatAttendanceSummary(summary.present, summary.total)}
              </span>
            ) : null}
          </CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setShowSearch(!showSearch)}>
            {showSearch ? "Fechar busca" : "Adicionar aluno"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showSearch ? (
          <div className="mb-4 space-y-3">
            <input
              type="text"
              placeholder="Buscar aluno por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground"
            />
            {allStudentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : null}
            {searchQuery && searchResults.length === 0 && !allStudentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
            ) : null}
            {searchResults.slice(0, 10).map((student) => (
              <article
                key={student.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-background/50 p-3"
                data-testid="attendance-search-result"
              >
                <div>
                  <p className="text-sm font-medium">{student.name}</p>
                  {!rosterStudentIds.has(student.id) ? (
                    <Badge variant="warning" className="mt-1">
                      Fora da turma
                    </Badge>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  disabled={addMutation.isPending}
                  onClick={() => addMutation.mutate(student.id)}
                >
                  Marcar presença
                </Button>
              </article>
            ))}
          </div>
        ) : null}

        {rosterQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando presenças...</p>
        ) : roster.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhum aluno na turma.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {roster.map((entry) => (
              <RosterRow
                key={entry.studentId}
                entry={entry}
                invalidatingId={invalidatingId}
                invalidationReason={invalidationReason}
                isInvalidating={invalidateMutation.isPending}
                isAdding={addMutation.isPending}
                onAddPresence={() => addMutation.mutate(entry.studentId)}
                onStartInvalidate={(attendanceId) => {
                  setInvalidatingId(attendanceId);
                  setInvalidationReason("");
                }}
                onCancelInvalidate={() => setInvalidatingId(null)}
                onConfirmInvalidate={(attendanceId) =>
                  invalidateMutation.mutate({
                    attendanceId,
                    reason: invalidationReason,
                  })
                }
                onReasonChange={setInvalidationReason}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RosterRow(props: {
  entry: AttendanceRosterStudent;
  invalidatingId: string | null;
  invalidationReason: string;
  isInvalidating: boolean;
  isAdding: boolean;
  onAddPresence: () => void;
  onStartInvalidate: (attendanceId: string) => void;
  onCancelInvalidate: () => void;
  onConfirmInvalidate: (attendanceId: string) => void;
  onReasonChange: (reason: string) => void;
}) {
  const { entry } = props;
  const attendance = entry.attendance;
  const isPresent = attendance && !attendance.invalidatedAt;
  const isInvalidated = attendance?.invalidatedAt;
  const isInvalidatingThis = props.invalidatingId === attendance?.id;

  return (
    <article
      className={`rounded-2xl border p-3 ${
        isPresent
          ? "border-primary/30 bg-primary/5"
          : isInvalidated
            ? "border-destructive/30 bg-destructive/5"
            : "border-border bg-background/50"
      }`}
      data-testid="attendance-roster-row"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{entry.studentName}</span>
          {entry.isOutOfGroup ? <Badge variant="warning">Fora da turma</Badge> : null}
          {isPresent ? (
            <Badge variant="default">{attendance.source === "manual" ? "Manual" : "QR Code"}</Badge>
          ) : null}
          {isInvalidated ? <Badge variant="muted">Invalidada</Badge> : null}
        </div>

        <div className="flex gap-2">
          {!isPresent && !isInvalidated ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={props.isAdding}
              onClick={props.onAddPresence}
            >
              Marcar presença
            </Button>
          ) : null}
          {isPresent && attendance ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => props.onStartInvalidate(attendance.id)}
            >
              Invalidar
            </Button>
          ) : null}
        </div>
      </div>

      {isInvalidated && attendance?.invalidationReason ? (
        <p className="mt-2 text-xs text-destructive">Motivo: {attendance.invalidationReason}</p>
      ) : null}

      {isInvalidatingThis && attendance ? (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            placeholder="Motivo da invalidação (obrigatório)..."
            value={props.invalidationReason}
            onChange={(e) => props.onReasonChange(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={props.onCancelInvalidate}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!props.invalidationReason.trim() || props.isInvalidating}
              onClick={() => props.onConfirmInvalidate(attendance.id)}
            >
              {props.isInvalidating ? "Invalidando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
