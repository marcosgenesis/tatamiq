import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationScrollIcon } from "hugeicons-react";
import { type FormEvent, useState } from "react";
import { Field, SelectField } from "../../components/form-field";
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
import { useBelts } from "../../hooks/use-belts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3100";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

type EligibilityType = "degree" | "belt" | "transition";
type TypeFilter = "all" | EligibilityType;

type EligibleStudent = {
  id: string;
  name: string;
  currentBeltId: string;
  currentBeltName: string;
  currentBeltPath: string;
  currentDegree: number;
  eligibilityType: EligibilityType;
  monthsSinceReference: number;
  attendancesSinceReference: number;
  requiredMonths: number;
  requiredAttendances: number;
};

type Belt = {
  id: string;
  name: string;
  slug: string;
  path: string;
  position: number;
  maxDegrees: number;
};

const typeLabels: Record<EligibilityType, string> = {
  degree: "Grau",
  belt: "Faixa",
  transition: "Transição",
};

const typeBadgeVariant: Record<EligibilityType, string> = {
  degree: "default",
  belt: "warning",
  transition: "muted",
};

export function GraduationPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // Promotion dialog state
  const [promoteStudent, setPromoteStudent] = useState<EligibleStudent | null>(null);
  const [promoteForm, setPromoteForm] = useState({
    newBeltId: "",
    newDegree: "",
    promotedAt: new Date().toISOString().slice(0, 10),
    note: "",
  });

  // Dismiss dialog state
  const [dismissStudent, setDismissStudent] = useState<EligibleStudent | null>(null);
  const [dismissForm, setDismissForm] = useState({ reason: "", days: "" });

  const summaryQuery = useQuery({
    queryKey: ["graduation", "summary"],
    queryFn: () =>
      apiFetch<{ degree: number; belt: number; transition: number }>("/graduation/summary"),
  });

  const eligibleQuery = useQuery({
    queryKey: ["graduation", "eligible", typeFilter],
    queryFn: () => {
      const qs = typeFilter === "all" ? "" : `?type=${typeFilter}`;
      return apiFetch<{ students: EligibleStudent[] }>(`/graduation/eligible${qs}`);
    },
  });

  const beltsQuery = useBelts({ enabled: promoteStudent !== null });

  const promoteMutation = useMutation({
    mutationFn: async ({
      studentId,
      newBeltId,
      newDegree,
      promotedAt,
      note,
    }: {
      studentId: string;
      newBeltId: string;
      newDegree: number;
      promotedAt: string;
      note?: string;
    }) => {
      await apiFetch(`/students/${studentId}/promotions`, {
        method: "POST",
        body: JSON.stringify({ newBeltId, newDegree, promotedAt, note: note || undefined }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["graduation"] });
      closePromote();
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async ({
      studentId,
      type,
      reason,
      days,
    }: {
      studentId: string;
      type: EligibilityType;
      reason?: string;
      days?: number;
    }) => {
      const body: Record<string, unknown> = { type };
      if (reason) body.reason = reason;
      if (days) body.days = days;
      await apiFetch(`/students/${studentId}/dismiss-eligibility`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["graduation"] });
      closeDismiss();
    },
  });

  const students = eligibleQuery.data?.students ?? [];
  const summary = summaryQuery.data;

  function openPromote(student: EligibleStudent) {
    setPromoteStudent(student);
    setPromoteForm({
      newBeltId: student.currentBeltId,
      newDegree: String(student.eligibilityType === "degree" ? student.currentDegree + 1 : 0),
      promotedAt: new Date().toISOString().slice(0, 10),
      note: "",
    });
  }

  function closePromote() {
    setPromoteStudent(null);
  }

  function submitPromote(e: FormEvent) {
    e.preventDefault();
    if (!promoteStudent) return;
    promoteMutation.mutate({
      studentId: promoteStudent.id,
      newBeltId: promoteForm.newBeltId,
      newDegree: Number(promoteForm.newDegree),
      promotedAt: promoteForm.promotedAt,
      note: promoteForm.note,
    });
  }

  function openDismiss(student: EligibleStudent) {
    setDismissStudent(student);
    setDismissForm({ reason: "", days: "" });
  }

  function closeDismiss() {
    setDismissStudent(null);
  }

  function submitDismiss(e: FormEvent) {
    e.preventDefault();
    if (!dismissStudent) return;
    const dismissPayload: {
      studentId: string;
      type: EligibilityType;
      reason?: string;
      days?: number;
    } = {
      studentId: dismissStudent.id,
      type: dismissStudent.eligibilityType,
    };
    if (dismissForm.reason) dismissPayload.reason = dismissForm.reason;
    if (dismissForm.days) dismissPayload.days = Number(dismissForm.days);
    dismissMutation.mutate(dismissPayload);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl md:p-8">
        <Badge variant="muted">Graduação</Badge>
        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Graduação</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Alunos elegíveis para promoção de grau, faixa ou transição. Promova ou adie conforme
              necessário.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard
          label="Grau"
          value={summary?.degree ?? 0}
          active={typeFilter === "degree"}
          onClick={() => setTypeFilter("degree")}
        />
        <SummaryCard
          label="Faixa"
          value={summary?.belt ?? 0}
          active={typeFilter === "belt"}
          onClick={() => setTypeFilter("belt")}
        />
        <SummaryCard
          label="Transição"
          value={summary?.transition ?? 0}
          active={typeFilter === "transition"}
          onClick={() => setTypeFilter("transition")}
        />
        <SummaryCard
          label="Total"
          value={(summary?.degree ?? 0) + (summary?.belt ?? 0) + (summary?.transition ?? 0)}
          active={typeFilter === "all"}
          onClick={() => setTypeFilter("all")}
        />
      </div>

      <Drawer
        direction="right"
        open={promoteStudent !== null}
        onOpenChange={(open: boolean) => {
          if (!open) closePromote();
        }}
      >
        <DrawerContent>
          <form className="flex h-full flex-col" onSubmit={submitPromote}>
            <DrawerHeader>
              <DrawerTitle>Promover {promoteStudent?.name}</DrawerTitle>
              <DrawerDescription>
                Selecione a nova faixa, grau e data da promoção.
              </DrawerDescription>
            </DrawerHeader>
            <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4">
              <SelectField
                label="Nova faixa"
                value={promoteForm.newBeltId}
                onChange={(v) => setPromoteForm((f) => ({ ...f, newBeltId: v }))}
                options={[
                  { value: "", label: "Selecione uma faixa" },
                  ...(beltsQuery.data?.belts ?? []).map((b) => ({
                    value: b.id,
                    label: b.name,
                  })),
                ]}
              />
              <Field
                label="Novo grau"
                type="number"
                min="0"
                value={promoteForm.newDegree}
                onChange={(v) => setPromoteForm((f) => ({ ...f, newDegree: v }))}
              />
              <Field
                label="Data da promoção"
                type="date"
                value={promoteForm.promotedAt}
                onChange={(v) => setPromoteForm((f) => ({ ...f, promotedAt: v }))}
              />
              <Field
                label="Observação (opcional)"
                value={promoteForm.note}
                onChange={(v) => setPromoteForm((f) => ({ ...f, note: v }))}
              />
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </DrawerClose>
              <Button type="submit" disabled={promoteMutation.isPending}>
                {promoteMutation.isPending ? "Promovendo..." : "Confirmar promoção"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer
        direction="right"
        open={dismissStudent !== null}
        onOpenChange={(open: boolean) => {
          if (!open) closeDismiss();
        }}
      >
        <DrawerContent>
          <form className="flex h-full flex-col" onSubmit={submitDismiss}>
            <DrawerHeader>
              <DrawerTitle>Adiar elegibilidade de {dismissStudent?.name}</DrawerTitle>
              <DrawerDescription>Informe o motivo e por quantos dias adiar.</DrawerDescription>
            </DrawerHeader>
            <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4">
              <Field
                label="Motivo (opcional)"
                value={dismissForm.reason}
                onChange={(v) => setDismissForm((f) => ({ ...f, reason: v }))}
              />
              <Field
                label="Adiar por quantos dias? (opcional)"
                type="number"
                min="1"
                value={dismissForm.days}
                onChange={(v) => setDismissForm((f) => ({ ...f, days: v }))}
              />
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </DrawerClose>
              <Button type="submit" disabled={dismissMutation.isPending}>
                {dismissMutation.isPending ? "Adiando..." : "Confirmar"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Students table */}
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle>Alunos elegíveis</CardTitle>
          <span className="text-sm text-muted-foreground">{students.length} aluno(s)</span>
        </CardHeader>
        <CardContent>
          {eligibleQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : null}
          {eligibleQuery.isError ? (
            <p className="text-sm text-destructive">Erro ao carregar alunos elegíveis.</p>
          ) : null}
          {!eligibleQuery.isLoading && students.length === 0 ? (
            <div className="grid place-items-center rounded-3xl border border-dashed border-border p-10 text-center">
              <div className="grid size-14 place-items-center rounded-3xl bg-muted text-primary">
                <GraduationScrollIcon className="size-7" />
              </div>
              <h2 className="mt-4 font-semibold">Nenhum aluno elegível</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Não há alunos elegíveis para promoção no momento.
              </p>
            </div>
          ) : null}
          {students.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="hidden grid-cols-[1.2fr_1fr_0.6fr_0.8fr_0.8fr_1fr] gap-4 border-border border-b bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] md:grid">
                <span>Aluno</span>
                <span>Faixa / Grau</span>
                <span>Tipo</span>
                <span>Tempo</span>
                <span>Presenças</span>
                <span>Ações</span>
              </div>
              <div className="divide-y divide-border">
                {students.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    onPromote={() => openPromote(student)}
                    onDismiss={() => openDismiss(student)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard(props: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-3xl border p-5 text-left transition ${
        props.active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/70"
      }`}
    >
      <span className="text-sm text-muted-foreground">{props.label}</span>
      <strong className="mt-2 block text-3xl">{props.value}</strong>
    </button>
  );
}

function StudentRow(props: {
  student: EligibleStudent;
  onPromote: () => void;
  onDismiss: () => void;
}) {
  const s = props.student;
  const monthsPercent =
    s.requiredMonths > 0
      ? Math.min(100, Math.round((s.monthsSinceReference / s.requiredMonths) * 100))
      : 100;
  const attendancesPercent =
    s.requiredAttendances > 0
      ? Math.min(100, Math.round((s.attendancesSinceReference / s.requiredAttendances) * 100))
      : 100;

  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_1fr_0.6fr_0.8fr_0.8fr_1fr] md:items-center">
      <strong>{s.name}</strong>
      <span className="text-sm text-muted-foreground">
        {s.currentBeltName} &middot; {s.currentDegree}&deg; grau
      </span>
      <div>
        <Badge variant={typeBadgeVariant[s.eligibilityType] as "default"}>
          {typeLabels[s.eligibilityType]}
        </Badge>
      </div>
      <span
        className="text-sm text-muted-foreground"
        title={`${monthsPercent}% do tempo necessário`}
      >
        {s.monthsSinceReference}/{s.requiredMonths} meses
      </span>
      <span
        className="text-sm text-muted-foreground"
        title={`${attendancesPercent}% das presenças necessárias`}
      >
        {s.attendancesSinceReference}/{s.requiredAttendances} presenças
      </span>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={props.onPromote}>
          Promover
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={props.onDismiss}>
          Adiar
        </Button>
      </div>
    </div>
  );
}
