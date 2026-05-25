import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClassGroup } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import { PlusSignIcon } from "hugeicons-react";
import {
  type Dispatch,
  type FormEvent,
  type InputHTMLAttributes,
  type SetStateAction,
  useMemo,
  useState,
} from "react";
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

type ClassGroupStatusFilter = "active" | "archived" | "all";
type ClassGroupPayload = components["schemas"]["UpdateClassGroupDto"];
type ScheduleFormRow = { id: string; weekday: string; startTime: string };
type ClassGroupFormState = {
  name: string;
  defaultDurationMinutes: string;
  status: ClassGroup["status"];
  schedules: ScheduleFormRow[];
  tags: string;
  studentIds: string[];
};

const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const emptyForm: ClassGroupFormState = {
  name: "",
  defaultDurationMinutes: "60",
  status: "active",
  schedules: [{ id: crypto.randomUUID(), weekday: "1", startTime: "19:00" }],
  tags: "",
  studentIds: [],
};

export function ClassGroupsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ClassGroupStatusFilter>("active");
  const [editingClassGroup, setEditingClassGroup] = useState<ClassGroup | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<ClassGroupFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const classGroupsQuery = useQuery({
    queryKey: ["class-groups", status],
    queryFn: async () => {
      const { data, error } = await api.GET("/class-groups", { params: { query: { status } } });
      if (error) throw new Error("Não foi possível carregar turmas.");
      return data;
    },
  });

  const studentsQuery = useQuery({
    queryKey: ["students", "active", "for-class-groups"],
    queryFn: async () => {
      const { data, error } = await api.GET("/students", {
        params: { query: { status: "active" } },
      });
      if (error) throw new Error("Não foi possível carregar alunos.");
      return data.students;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (input: ClassGroupPayload) => {
      if (editingClassGroup) {
        const { data, error } = await api.PATCH("/class-groups/{id}", {
          params: { path: { id: editingClassGroup.id } },
          body: input,
        });
        if (error) throw new Error("Não foi possível salvar a turma.");
        return data;
      }

      const { data, error } = await api.POST("/class-groups", { body: input });
      if (error) throw new Error("Não foi possível criar a turma.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["class-groups"] });
      closeForm();
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Erro ao salvar turma.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "archive" | "reactivate" }) => {
      if (action === "archive") {
        const { error } = await api.POST("/class-groups/{id}/archive", {
          params: { path: { id } },
        });
        if (error) throw new Error("Não foi possível arquivar a turma.");
        return;
      }
      const { error } = await api.POST("/class-groups/{id}/reactivate", {
        params: { path: { id } },
      });
      if (error) throw new Error("Não foi possível reativar a turma.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["class-groups"] });
    },
  });

  const classGroups = classGroupsQuery.data?.classGroups ?? [];
  const summary = classGroupsQuery.data?.summary;
  const title = useMemo(() => {
    if (status === "active") return "Turmas ativas";
    if (status === "archived") return "Turmas arquivadas";
    return "Todas as turmas";
  }, [status]);

  function openCreateForm() {
    setEditingClassGroup(null);
    setForm(emptyForm);
    setError(null);
    setIsFormOpen(true);
  }

  function openEditForm(classGroup: ClassGroup) {
    setEditingClassGroup(classGroup);
    setForm({
      name: classGroup.name,
      defaultDurationMinutes: String(classGroup.defaultDurationMinutes),
      status: classGroup.status,
      schedules: classGroup.schedules.map((schedule) => ({
        id: schedule.id,
        weekday: String(schedule.weekday),
        startTime: schedule.startTime,
      })),
      tags: classGroup.tags.join(", "),
      studentIds: classGroup.students.map((student) => student.id),
    });
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingClassGroup(null);
    setError(null);
  }

  function updateSchedule(index: number, field: keyof ScheduleFormRow, value: string) {
    setForm((current) => ({
      ...current,
      schedules: current.schedules.map((schedule, scheduleIndex) =>
        scheduleIndex === index ? { ...schedule, [field]: value } : schedule,
      ),
    }));
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload: ClassGroupPayload = {
      name: form.name,
      defaultDurationMinutes: Number(form.defaultDurationMinutes),
      schedules: form.schedules.map((schedule) => ({
        weekday: Number(schedule.weekday),
        startTime: schedule.startTime,
      })),
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      studentIds: form.studentIds,
    };

    if (editingClassGroup) payload.status = form.status;
    saveMutation.mutate(payload);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl md:p-8">
        <Badge variant="muted">Turmas V0</Badge>
        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Turmas</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Organize horários recorrentes, etiquetas e alunos vinculados a cada turma.
            </p>
          </div>
          <Button onClick={openCreateForm}>
            <PlusSignIcon className="size-4" /> Nova turma
          </Button>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          label="Ativas"
          value={summary?.active ?? 0}
          active={status === "active"}
          onClick={() => setStatus("active")}
        />
        <SummaryCard
          label="Arquivadas"
          value={summary?.archived ?? 0}
          active={status === "archived"}
          onClick={() => setStatus("archived")}
        />
        <SummaryCard
          label="Total"
          value={summary?.total ?? 0}
          active={status === "all"}
          onClick={() => setStatus("all")}
        />
      </div>

      <Drawer
        direction="right"
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
      >
        <DrawerContent>
          <ClassGroupForm
            editingClassGroup={editingClassGroup}
            error={error}
            form={form}
            isSaving={saveMutation.isPending}
            students={studentsQuery.data ?? []}
            setForm={setForm}
            onCancel={closeForm}
            onSubmit={submitForm}
            updateSchedule={updateSchedule}
          />
        </DrawerContent>
      </Drawer>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle>{title}</CardTitle>
          <span className="text-sm text-muted-foreground">{classGroups.length} turma(s)</span>
        </CardHeader>
        <CardContent>
          {classGroupsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando turmas...</p>
          ) : null}
          {classGroupsQuery.isError ? (
            <p className="text-sm text-destructive">Não foi possível carregar turmas.</p>
          ) : null}
          {!classGroupsQuery.isLoading && classGroups.length === 0 ? (
            <EmptyState onCreate={openCreateForm} />
          ) : null}
          {classGroups.length > 0 ? (
            <div className="grid gap-3">
              {classGroups.map((classGroup) => (
                <ClassGroupCard
                  key={classGroup.id}
                  classGroup={classGroup}
                  onEdit={() => openEditForm(classGroup)}
                  onToggleStatus={() =>
                    statusMutation.mutate({
                      id: classGroup.id,
                      action: classGroup.status === "active" ? "archive" : "reactivate",
                    })
                  }
                />
              ))}
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
      className={`rounded-3xl border p-5 text-left transition ${props.active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/70"}`}
    >
      <span className="text-sm text-muted-foreground">{props.label}</span>
      <strong className="mt-2 block text-3xl">{props.value}</strong>
    </button>
  );
}

function ClassGroupForm(props: {
  editingClassGroup: ClassGroup | null;
  error: string | null;
  form: ClassGroupFormState;
  isSaving: boolean;
  students: Array<{ id: string; name: string }>;
  setForm: Dispatch<SetStateAction<ClassGroupFormState>>;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  updateSchedule: (index: number, field: keyof ScheduleFormRow, value: string) => void;
}) {
  return (
    <form className="flex h-full flex-col" onSubmit={props.onSubmit}>
      <DrawerHeader>
        <DrawerTitle>{props.editingClassGroup ? "Editar turma" : "Nova turma"}</DrawerTitle>
        <DrawerDescription>
          {props.editingClassGroup
            ? "Atualize os dados da turma."
            : "Preencha os dados para criar uma nova turma."}
        </DrawerDescription>
      </DrawerHeader>
      <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-4">
        <div className="grid gap-4">
          <TextField
            label="Nome"
            required
            value={props.form.name}
            onChange={(value) => props.setForm((current) => ({ ...current, name: value }))}
          />
          <TextField
            label="Duração padrão (min)"
            required
            type="number"
            min="15"
            max="300"
            value={props.form.defaultDurationMinutes}
            onChange={(value) =>
              props.setForm((current) => ({ ...current, defaultDurationMinutes: value }))
            }
          />
          <TextField
            label="Etiquetas"
            placeholder="No Gi, Iniciante"
            value={props.form.tags}
            onChange={(value) => props.setForm((current) => ({ ...current, tags: value }))}
          />
          {props.editingClassGroup ? (
            <label className="space-y-2 text-sm font-medium">
              <span>Status</span>
              <select
                value={props.form.status}
                onChange={(event) =>
                  props.setForm((current) => ({
                    ...current,
                    status: event.target.value as ClassGroup["status"],
                  }))
                }
                className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="active">Ativa</option>
                <option value="archived">Arquivada</option>
              </select>
            </label>
          ) : null}
        </div>

        <div className="rounded-3xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">Horários semanais</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Informe pelo menos um dia e horário.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                props.setForm((current) => ({
                  ...current,
                  schedules: [
                    ...current.schedules,
                    { id: crypto.randomUUID(), weekday: "1", startTime: "19:00" },
                  ],
                }))
              }
            >
              Adicionar horário
            </Button>
          </div>
          <div className="mt-4 grid gap-3">
            {props.form.schedules.map((schedule, index) => (
              <div key={schedule.id} className="grid grid-cols-[1fr_1fr_auto] gap-3">
                <label className="space-y-2 text-sm font-medium">
                  <span>Dia</span>
                  <select
                    value={schedule.weekday}
                    onChange={(event) => props.updateSchedule(index, "weekday", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {weekdays.map((weekday, weekdayIndex) => (
                      <option key={weekday} value={weekdayIndex}>
                        {weekday}
                      </option>
                    ))}
                  </select>
                </label>
                <TextField
                  label="Horário"
                  placeholder="HH:mm"
                  value={schedule.startTime}
                  onChange={(value) => props.updateSchedule(index, "startTime", value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="self-end"
                  onClick={() =>
                    props.setForm((current) => ({
                      ...current,
                      schedules: current.schedules.filter(
                        (_, scheduleIndex) => scheduleIndex !== index,
                      ),
                    }))
                  }
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-muted/30 p-4">
          <h3 className="font-medium">Alunos vinculados</h3>
          <div className="mt-4 grid gap-2">
            {props.students.map((student) => (
              <label
                key={student.id}
                className="flex items-center gap-2 rounded-2xl border border-border bg-background p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={props.form.studentIds.includes(student.id)}
                  onChange={(event) =>
                    props.setForm((current) => ({
                      ...current,
                      studentIds: event.target.checked
                        ? [...current.studentIds, student.id]
                        : current.studentIds.filter((id) => id !== student.id),
                    }))
                  }
                />
                {student.name}
              </label>
            ))}
            {props.students.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Cadastre alunos ativos antes de vinculá-los.
              </p>
            ) : null}
          </div>
        </div>

        {props.error ? <p className="text-sm text-destructive">{props.error}</p> : null}
      </div>
      <DrawerFooter>
        <DrawerClose asChild>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </DrawerClose>
        <Button type="submit" disabled={props.isSaving}>
          {props.isSaving ? "Salvando..." : "Salvar turma"}
        </Button>
      </DrawerFooter>
    </form>
  );
}

function TextField(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
    label: string;
    onChange: (value: string) => void;
  },
) {
  const { label, onChange, ...inputProps } = props;
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{label}</span>
      <input
        {...inputProps}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function ClassGroupCard(props: {
  classGroup: ClassGroup;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  const classGroup = props.classGroup;
  return (
    <div className="rounded-3xl border border-border bg-background/60 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{classGroup.name}</h3>
            <Badge variant={classGroup.status === "active" ? "default" : "muted"}>
              {classGroup.status === "active" ? "Ativa" : "Arquivada"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {classGroup.defaultDurationMinutes} min · {classGroup.students.length} aluno(s)
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{scheduleSummary(classGroup)}</p>
          {classGroup.tags.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {classGroup.tags.map((tag) => `#${tag}`).join(" ")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={props.onEdit}>
            Editar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={props.onToggleStatus}>
            {classGroup.status === "active" ? "Arquivar" : "Reativar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState(props: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border p-10 text-center">
      <h2 className="font-semibold">Nenhuma turma por aqui ainda</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Crie a primeira turma recorrente da academia.
      </p>
      <Button className="mt-5" onClick={props.onCreate}>
        Cadastrar turma
      </Button>
    </div>
  );
}

function scheduleSummary(classGroup: ClassGroup): string {
  return classGroup.schedules
    .map((schedule) => `${weekdays[schedule.weekday]} ${schedule.startTime}`)
    .join(" · ");
}
