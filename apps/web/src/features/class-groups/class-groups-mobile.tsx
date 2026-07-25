import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClassGroup } from "@tatamiq/contracts";
import { Clock01Icon, InboxIcon, MoreVerticalIcon, PlusSignIcon } from "hugeicons-react";
import { useMemo, useState } from "react";
import { api } from "@/api";
import { useAppShell } from "@/components/app-shell";
import {
  ActionButton,
  EmptyState,
  MobileScreen,
  PrimaryPill,
  ScreenHeader,
  SearchField,
  SegmentedTabs,
} from "@/components/mobile/mobile-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { academyQueryKey, onboardingChecklistQueryKey } from "@/lib/academy-query-keys";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";
import { ClassGroupForm, type ClassGroupPayload } from "./class-group-form";
import {
  type ClassGroupStatusFilter,
  classGroupsKeys,
  saveClassGroup,
  setClassGroupStatus,
} from "./class-groups-queries";

const WEEKDAYS = [
  ["dom", "D"],
  ["seg", "S"],
  ["ter", "T"],
  ["qua", "Q"],
  ["qui", "Q"],
  ["sex", "S"],
  ["sab", "S"],
] as const;

function startTimeLabel(classGroup: ClassGroup): string {
  const times = [...new Set(classGroup.schedules.map((s) => s.startTime))].sort();
  if (times.length === 0) return "Sem horários definidos";
  if (times.length === 1) return `Aulas às ${times[0]}`;
  return `Horários: ${times.join(" · ")}`;
}

export function ClassGroupsMobile() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const academyId = activeAcademy.id;

  const [statusFilter, setStatusFilter] = useState<ClassGroupStatusFilter>("active");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClassGroup, setEditingClassGroup] = useState<ClassGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archivingClassGroup, setArchivingClassGroup] = useState<ClassGroup | null>(null);

  const classGroupsQuery = useQuery({
    queryKey: classGroupsKeys.list(academyId, statusFilter),
    queryFn: async () => {
      const { data, error: err } = await api.GET("/class-groups", {
        params: { query: { status: statusFilter } },
      });
      if (err) throw new Error("Não foi possível carregar turmas.");
      return data;
    },
    enabled: !!academyId,
  });

  const studentsQuery = useQuery({
    queryKey: classGroupsKeys.students(academyId),
    queryFn: async () => {
      const { data, error: err } = await api.GET("/students", {
        params: { query: { status: "active" } },
      });
      if (err) throw new Error("Não foi possível carregar alunos.");
      return data.students;
    },
    enabled: !!academyId,
  });

  async function invalidateAll() {
    await queryClient.invalidateQueries({ queryKey: classGroupsKeys.all(academyId) });
    await queryClient.invalidateQueries({ queryKey: academyQueryKey(academyId, "schedule") });
    await queryClient.invalidateQueries({ queryKey: onboardingChecklistQueryKey(academyId) });
  }

  const saveMutation = useMutation({
    mutationFn: (payload: ClassGroupPayload) =>
      saveClassGroup(editingClassGroup?.id ?? null, payload),
    onSuccess: async () => {
      await invalidateAll();
      closeForm();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Erro ao salvar turma."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "archive" | "reactivate" }) =>
      setClassGroupStatus(id, action),
    onSuccess: invalidateAll,
  });

  const classGroups = classGroupsQuery.data?.classGroups ?? [];
  const summary = classGroupsQuery.data?.summary;
  const tagSuggestions = useMemo(
    () => Array.from(new Set(classGroups.flatMap((c) => c.tags))).sort(),
    [classGroups],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classGroups;
    return classGroups.filter(
      (c) => c.name.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [classGroups, search]);

  function openCreate() {
    setEditingClassGroup(null);
    setError(null);
    setIsFormOpen(true);
  }
  function openEdit(classGroup: ClassGroup) {
    setEditingClassGroup(classGroup);
    setError(null);
    setIsFormOpen(true);
  }
  function closeForm() {
    setIsFormOpen(false);
    setEditingClassGroup(null);
  }

  return (
    <MobileScreen>
      <ScreenHeader
        title="Turmas"
        count={summary?.total}
        action={<ActionButton icon={PlusSignIcon} label="Nova" onClick={openCreate} />}
      />
      <SegmentedTabs
        value={statusFilter}
        onChange={setStatusFilter}
        tabs={[
          { value: "active", label: "Ativas" },
          { value: "archived", label: "Arquivadas" },
        ]}
      />
      <SearchField value={search} onChange={setSearch} placeholder="Buscar turma..." />

      {classGroupsQuery.isLoading ? (
        <p className="px-1 py-8 text-center text-[13px] text-m-ink-3">Carregando turmas...</p>
      ) : classGroupsQuery.isError ? (
        <p className="px-1 py-8 text-center text-[13px] text-destructive">
          Não foi possível carregar turmas.
        </p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="Nenhuma turma ainda"
          description="Crie a primeira turma recorrente para organizar horários e alunos."
          action={
            <PrimaryPill icon={PlusSignIcon} onClick={openCreate}>
              Nova turma
            </PrimaryPill>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((classGroup) => (
            <ClassGroupCard
              key={classGroup.id}
              classGroup={classGroup}
              onEdit={() => openEdit(classGroup)}
              onArchive={() => setArchivingClassGroup(classGroup)}
              onReactivate={() =>
                statusMutation.mutate({ id: classGroup.id, action: "reactivate" })
              }
            />
          ))}
        </div>
      )}

      <Drawer
        direction="right"
        dismissible={false}
        open={isFormOpen}
        onOpenChange={(open) => {
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
            onSubmit={(payload) => saveMutation.mutate(payload)}
          />
        </DrawerContent>
      </Drawer>

      <Dialog
        open={archivingClassGroup !== null}
        onOpenChange={(open) => {
          if (!open) setArchivingClassGroup(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar turma</DialogTitle>
            <DialogDescription>
              {archivingClassGroup
                ? `Arquivar "${archivingClassGroup.name}"? Você pode reativá-la depois.`
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
    </MobileScreen>
  );
}

function ClassGroupCard({
  classGroup,
  onEdit,
  onArchive,
  onReactivate,
}: {
  classGroup: ClassGroup;
  onEdit: () => void;
  onArchive: () => void;
  onReactivate: () => void;
}) {
  const isActive = classGroup.status === "active";
  const activeWeekdays = new Set(classGroup.schedules.map((s) => s.weekday));
  const visible = classGroup.students.slice(0, 3);
  const remaining = classGroup.students.length - visible.length;

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="min-w-0 flex-1 truncate text-left text-[14px] font-medium text-m-ink"
        >
          {classGroup.name}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Ações da turma"
            className="-mr-1 grid size-6 place-items-center rounded-md text-m-ink-3 outline-none"
          >
            <MoreVerticalIcon className="size-3.5" strokeWidth={1.8} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
            {isActive ? (
              <DropdownMenuItem
                onClick={onArchive}
                className="text-destructive focus:text-destructive"
              >
                Arquivar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onReactivate}>Reativar</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {classGroup.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {classGroup.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-m-surface px-2.5 py-0.5 text-[12px] text-m-ink-2"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5">
          {WEEKDAYS.map(([key, label], i) => {
            const on = activeWeekdays.has(i);
            return (
              <span
                key={key}
                className={cn(
                  "grid h-8 flex-1 place-items-center rounded-lg text-[12px]",
                  on
                    ? "bg-primary font-medium text-primary-foreground"
                    : "bg-m-surface text-m-ink-2",
                )}
              >
                {label}
              </span>
            );
          })}
        </div>
        <p className="text-[12px] text-m-ink-2">{startTimeLabel(classGroup)}</p>
      </div>

      <div className="flex items-center justify-between gap-2 border-border border-t pt-3.5">
        {classGroup.students.length > 0 ? (
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              {visible.map((student) => (
                <span
                  key={student.id}
                  className="grid size-6 place-items-center rounded-full border-2 border-card bg-m-surface text-[10px] font-medium text-m-ink-2"
                >
                  {initials(student.name)}
                </span>
              ))}
              {remaining > 0 ? (
                <span className="grid size-6 place-items-center rounded-full border-2 border-card bg-primary-soft text-[10px] font-medium text-primary-soft-foreground">
                  +{remaining}
                </span>
              ) : null}
            </div>
            <span className="text-[13px] text-m-ink">
              {classGroup.students.length} {classGroup.students.length === 1 ? "aluno" : "alunos"}
            </span>
          </div>
        ) : (
          <span className="text-[13px] text-m-ink-3">Sem alunos</span>
        )}
        <span className="flex items-center gap-1.5 rounded-full bg-m-surface px-2.5 py-1 text-[12px] text-m-ink-2">
          <Clock01Icon className="size-3.5 text-m-ink-3" strokeWidth={1.8} />
          {classGroup.defaultDurationMinutes} min
        </span>
      </div>
    </div>
  );
}
