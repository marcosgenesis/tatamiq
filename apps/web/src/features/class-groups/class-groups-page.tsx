import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClassGroup } from "@tatamiq/contracts";
import {
  Archive02Icon,
  ArchiveArrowUpIcon,
  Edit02Icon,
  InboxIcon,
  MoreVerticalIcon,
  PlusSignIcon,
  Search01Icon,
  Time04Icon,
} from "hugeicons-react";
import { useMemo, useState } from "react";
import { api } from "../../api";
import { useAppShell } from "../../components/app-shell";
import { Tabs, TabsList, TabsTrigger } from "../../components/reui/tabs";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "../../components/ui/avatar";
import { Badge, BadgeDot } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Drawer, DrawerContent } from "../../components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import { ClassGroupForm, type ClassGroupPayload } from "./class-group-form";

type ClassGroupStatusFilter = "active" | "archived" | "all";

const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const weekdaysShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const weekdayInitials = ["D", "S", "T", "Q", "Q", "S", "S"];

export const classGroupsKeys = {
  all: (academyId: string | null | undefined) =>
    ["class-groups", academyId ?? "no-academy"] as const,
  list: (academyId: string | null | undefined, status: ClassGroupStatusFilter) =>
    [...classGroupsKeys.all(academyId), status] as const,
  students: (academyId: string | null | undefined) =>
    ["students", academyId ?? "no-academy", "active", "for-class-groups"] as const,
};

export function ClassGroupsPage() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const [statusFilter, setStatusFilter] = useState<ClassGroupStatusFilter>("active");
  const [search, setSearch] = useState("");
  const [editingClassGroup, setEditingClassGroup] = useState<ClassGroup | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivingClassGroup, setArchivingClassGroup] = useState<ClassGroup | null>(null);

  const classGroupsQuery = useQuery({
    queryKey: classGroupsKeys.list(activeAcademyId, statusFilter),
    queryFn: async () => {
      const { data, error } = await api.GET("/class-groups", {
        params: { query: { status: statusFilter } },
      });
      if (error) throw new Error("Não foi possível carregar turmas.");
      return data;
    },
    enabled: !!activeAcademyId,
  });

  const studentsQuery = useQuery({
    queryKey: classGroupsKeys.students(activeAcademyId),
    queryFn: async () => {
      const { data, error } = await api.GET("/students", {
        params: { query: { status: "active" } },
      });
      if (error) throw new Error("Não foi possível carregar alunos.");
      return data.students;
    },
    enabled: !!activeAcademyId,
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
      await queryClient.invalidateQueries({ queryKey: classGroupsKeys.all(activeAcademyId) });
      await queryClient.invalidateQueries({ queryKey: ["schedule"] });
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
      await queryClient.invalidateQueries({ queryKey: classGroupsKeys.all(activeAcademyId) });
      await queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });

  const classGroups = classGroupsQuery.data?.classGroups ?? [];
  const summary = classGroupsQuery.data?.summary;
  const tagSuggestions = useMemo(
    () => Array.from(new Set(classGroups.flatMap((classGroup) => classGroup.tags))).sort(),
    [classGroups],
  );

  const filteredClassGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return classGroups;
    return classGroups.filter(
      (classGroup) =>
        classGroup.name.toLowerCase().includes(query) ||
        classGroup.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [classGroups, search]);

  function openCreateForm() {
    setEditingClassGroup(null);
    setError(null);
    setIsFormOpen(true);
  }

  function openEditForm(classGroup: ClassGroup) {
    setEditingClassGroup(classGroup);
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingClassGroup(null);
    setError(null);
  }

  function submitForm(payload: ClassGroupPayload) {
    setError(null);
    saveMutation.mutate(payload);
  }

  const isEmpty = !classGroupsQuery.isLoading && classGroups.length === 0;
  const isNoMatches =
    !classGroupsQuery.isLoading && classGroups.length > 0 && filteredClassGroups.length === 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Turmas</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Organize horários recorrentes, etiquetas e alunos vinculados a cada turma.
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <PlusSignIcon className="size-4" /> Nova turma
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search01Icon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar turma ou etiqueta"
            className="h-9 rounded-lg pl-8"
            aria-label="Buscar turma"
          />
        </div>
        <Tabs
          className="w-auto"
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ClassGroupStatusFilter)}
        >
          <TabsList>
            <TabsTrigger value="active">
              Ativas{summary ? <Count value={summary.active} /> : null}
            </TabsTrigger>
            <TabsTrigger value="archived">
              Arquivadas{summary ? <Count value={summary.archived} /> : null}
            </TabsTrigger>
            <TabsTrigger value="all">
              Todas{summary ? <Count value={summary.total} /> : null}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Drawer
        direction="right"
        dismissible={false}
        open={isFormOpen}
        onOpenChange={(open: boolean) => {
          if (!open) closeForm();
        }}
      >
        <DrawerContent>
          <ClassGroupForm
            editingClassGroup={editingClassGroup}
            error={error}
            isSaving={saveMutation.isPending}
            students={studentsQuery.data ?? []}
            tagSuggestions={tagSuggestions}
            onCancel={closeForm}
            onSubmit={submitForm}
          />
        </DrawerContent>
      </Drawer>

      <Dialog
        open={archivingClassGroup !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setArchivingClassGroup(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar turma</DialogTitle>
            <DialogDescription>
              {archivingClassGroup
                ? `Tem certeza que deseja arquivar "${archivingClassGroup.name}"? Você pode reativá-la depois.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (!archivingClassGroup) return;
                statusMutation.mutate(
                  { id: archivingClassGroup.id, action: "archive" },
                  { onSuccess: () => setArchivingClassGroup(null) },
                );
              }}
            >
              {statusMutation.isPending ? "Arquivando..." : "Arquivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div>
        {classGroupsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando turmas...</p>
        ) : null}
        {classGroupsQuery.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar turmas.</p>
        ) : null}
        {isEmpty ? <EmptyState onCreate={openCreateForm} /> : null}
        {isNoMatches ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma turma encontrada para “{search.trim()}”.
          </p>
        ) : null}
        {filteredClassGroups.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {filteredClassGroups.map((classGroup) => (
              <ClassGroupCard
                key={classGroup.id}
                classGroup={classGroup}
                onEdit={() => openEditForm(classGroup)}
                onToggleStatus={() => {
                  if (classGroup.status === "active") {
                    setArchivingClassGroup(classGroup);
                    return;
                  }
                  statusMutation.mutate({ id: classGroup.id, action: "reactivate" });
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Count(props: { value: number }) {
  return (
    <span className="ml-1.5 text-xs text-muted-foreground tabular-nums group-data-[selected]:text-foreground">
      {props.value}
    </span>
  );
}

function ClassGroupCard(props: {
  classGroup: ClassGroup;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  const classGroup = props.classGroup;
  const isActive = classGroup.status === "active";
  const activeWeekdays = new Set(classGroup.schedules.map((schedule) => schedule.weekday));
  const visibleStudents = classGroup.students.slice(0, 3);
  const remainingStudents = classGroup.students.length - visibleStudents.length;

  return (
    <button
      type="button"
      onClick={props.onEdit}
      className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`Editar turma ${classGroup.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate font-semibold leading-tight">{classGroup.name}</h3>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant={isActive ? "success" : "muted"} size="sm" className="gap-1">
            <BadgeDot />
            {isActive ? "Ativa" : "Arquivada"}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Ações da turma"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreVerticalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
              <DropdownMenuItem onClick={props.onEdit}>
                <Edit02Icon className="size-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={isActive ? "text-destructive" : undefined}
                onClick={props.onToggleStatus}
              >
                {isActive ? (
                  <>
                    <Archive02Icon className="size-4" /> Arquivar
                  </>
                ) : (
                  <>
                    <ArchiveArrowUpIcon className="size-4" /> Reativar
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {classGroup.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {classGroup.tags.map((tag) => (
            <Badge key={tag} variant="muted" size="sm">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5">
          {weekdays.map((dayName, index) => {
            const on = activeWeekdays.has(index);
            return (
              <span
                key={dayName}
                className={
                  on
                    ? "grid size-7 place-items-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground"
                    : "grid size-7 place-items-center rounded-lg bg-muted text-[11px] font-semibold text-muted-foreground"
                }
                title={dayName}
              >
                {weekdayInitials[index]}
              </span>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{scheduleSummary(classGroup)}</p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        {classGroup.students.length > 0 ? (
          <div className="flex items-center gap-2.5">
            <AvatarGroup>
              {visibleStudents.map((student) => (
                <Avatar key={student.id} size="sm">
                  <AvatarFallback className="text-[10px]">{initials(student.name)}</AvatarFallback>
                </Avatar>
              ))}
              {remainingStudents > 0 ? (
                <AvatarGroupCount className="size-6 text-[10px]">
                  +{remainingStudents}
                </AvatarGroupCount>
              ) : null}
            </AvatarGroup>
            <span className="text-sm text-foreground">
              {classGroup.students.length} {classGroup.students.length === 1 ? "aluno" : "alunos"}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Sem alunos</span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          <Time04Icon className="size-3.5 text-muted-foreground" />
          {classGroup.defaultDurationMinutes} min
        </span>
      </div>
    </button>
  );
}

function EmptyState(props: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border p-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <InboxIcon className="size-6" />
      </div>
      <h2 className="font-semibold">Nenhuma turma por aqui ainda</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Crie a primeira turma recorrente da academia para organizar horários e alunos.
      </p>
      <Button className="mt-5" onClick={props.onCreate}>
        <PlusSignIcon className="size-4" /> Cadastrar turma
      </Button>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const value = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return value.toUpperCase() || "?";
}

function scheduleSummary(classGroup: ClassGroup): string {
  if (classGroup.schedules.length === 0) return "Sem horários definidos";
  return [...classGroup.schedules]
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime))
    .map((schedule) => `${weekdaysShort[schedule.weekday]} ${schedule.startTime}`)
    .join(" · ");
}
