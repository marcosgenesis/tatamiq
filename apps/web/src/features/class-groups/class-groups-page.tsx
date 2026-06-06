import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClassGroup } from "@tatamiq/contracts";
import { PlusSignIcon } from "hugeicons-react";
import { useMemo, useState } from "react";
import { api } from "../../api";
import { Badge } from "../../components/reui/badge";
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
import { ClassGroupForm, type ClassGroupPayload } from "./class-group-form";

type ClassGroupStatusFilter = "active" | "archived" | "all";

const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function ClassGroupsPage() {
  const queryClient = useQueryClient();
  const status: ClassGroupStatusFilter = "active";
  const [editingClassGroup, setEditingClassGroup] = useState<ClassGroup | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivingClassGroup, setArchivingClassGroup] = useState<ClassGroup | null>(null);

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
  const tagSuggestions = useMemo(
    () => Array.from(new Set(classGroups.flatMap((classGroup) => classGroup.tags))).sort(),
    [classGroups],
  );

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

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex gap-1.5 items-center">
            <h1 className="text-2xl">Turmas</h1>
          </div>

          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Organize horários recorrentes, etiquetas e alunos vinculados a cada turma.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateForm}>
            <PlusSignIcon className="size-4" /> Nova Turma
          </Button>
        </div>
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
        {!classGroupsQuery.isLoading && classGroups.length === 0 ? (
          <EmptyState onCreate={openCreateForm} />
        ) : null}
        {classGroups.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {classGroups.map((classGroup) => (
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

function ClassGroupCard(props: {
  classGroup: ClassGroup;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  const classGroup = props.classGroup;
  return (
    <div className="border border-border bg-background/60 p-4">
      <div className="">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{classGroup.name}</h3>
            <Badge variant={classGroup.status === "active" ? "success" : "destructive"}>
              {classGroup.status === "active" ? "Ativa" : "Arquivada"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {classGroup.defaultDurationMinutes} min · {classGroup.students.length} aluno(s)
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{scheduleSummary(classGroup)}</p>
          <div className="my-2">
            {classGroup.tags.length > 0
              ? classGroup.tags.map((tag) => (
                  <Badge variant="primary-outline" key={tag}>
                    {tag}
                  </Badge>
                ))
              : null}
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2">
          <Button
            type="button"
            className="w-full"
            variant="secondary"
            size="sm"
            onClick={props.onEdit}
          >
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={props.onToggleStatus}
          >
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
