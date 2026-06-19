import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  getCoreRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import type { Student } from "@tatamiq/contracts";
import { AlertCircle, ChevronRight, MoreHorizontal, PlusCircle, UploadCloud } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { DataGrid, DataGridContainer } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/reui/tabs";
import { api } from "../../api";
import { useAppShell } from "../../components/app-shell";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Skeleton } from "../../components/ui/skeleton";
import { useBelts } from "../../hooks/use-belts";
import { useStudents } from "../../hooks/use-students";
import { academyQueryKey } from "../../lib/academy-query-keys";
import { ageLabel, billingLabel, formatDate } from "../../lib/formatting";
import { BeltVisual } from "../student-portal/components/belt-visual";
import { beltKeyFromName } from "../student-portal/lib/belt-progress";
import { StudentCsvImport } from "./components/student-csv-import";
import { StudentForm } from "./components/student-form";
import { PreRegistrationsTab } from "./pre-registrations-tab";

type StudentStatusFilter = "active" | "inactive" | "all";
type StudentsTab = "students" | "pre-registrations";

export function StudentsPage() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const [activeTab, setActiveTab] = useState<StudentsTab>("students");
  const [status, setStatus] = useState<StudentStatusFilter>("active");
  const [search, setSearch] = useState("");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const beltsQuery = useBelts({ academyId: activeAcademyId, enabled: !!activeAcademyId });
  const studentsQuery = useStudents(
    status,
    { page: pagination.pageIndex, pageSize: pagination.pageSize },
    { academyId: activeAcademyId, enabled: !!activeAcademyId },
  );

  const inviteMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await api.POST("/students/{id}/access-invites", {
        params: { path: { id: studentId } },
      });
      if (error) throw new Error("Não foi possível gerar convite.");
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: academyQueryKey(activeAcademyId, "students"),
      });
      toast("Link de convite gerado", {
        description: data.inviteLink,
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: "Copiar",
          onClick: () => navigator.clipboard.writeText(data.inviteLink),
        },
      });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async ({ studentId, inviteId }: { studentId: string; inviteId: string }) => {
      const { error } = await api.POST("/students/{id}/access-invites/{inviteId}/revoke", {
        params: { path: { id: studentId, inviteId } },
      });
      if (error) throw new Error("Não foi possível revogar convite.");
    },
    onSuccess: async () =>
      queryClient.invalidateQueries({ queryKey: academyQueryKey(activeAcademyId, "students") }),
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await api.POST("/students/{id}/access/revoke", {
        params: { path: { id: studentId } },
      });
      if (error) throw new Error("Não foi possível revogar acesso.");
    },
    onSuccess: async () =>
      queryClient.invalidateQueries({ queryKey: academyQueryKey(activeAcademyId, "students") }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "inactivate" | "reactivate" }) => {
      if (action === "inactivate") {
        const { error } = await api.POST("/students/{id}/inactivate", {
          params: { path: { id } },
        });
        if (error) throw new Error("Não foi possível atualizar o status do aluno.");
        return;
      }
      const { error } = await api.POST("/students/{id}/reactivate", {
        params: { path: { id } },
      });
      if (error) throw new Error("Não foi possível atualizar o status do aluno.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: academyQueryKey(activeAcademyId, "students"),
      });
    },
  });

  const [isImportOpen, setIsImportOpen] = useState(false);

  const allStudents = studentsQuery.data?.students ?? [];
  const summary = studentsQuery.data?.summary;

  const students = useMemo(() => {
    if (!search.trim()) return allStudents;
    const q = search.toLowerCase();
    return allStudents.filter((s) => s.name.toLowerCase().includes(q));
  }, [allStudents, search]);

  const hasAnyStudents = (summary?.total ?? 0) > 0;
  const noResults = search.trim() && students.length === 0 && !studentsQuery.isLoading;

  const openEditForm = useCallback((student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Aluno",
        size: 260,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                {s.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">{ageLabel(s.birthDate)}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 110,
        cell: ({ row }) => {
          const isActive = row.original.status === "active";
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${isActive ? "bg-green-400" : "bg-muted-foreground"}`}
                aria-hidden="true"
              />
              {isActive ? "Ativo" : "Inativo"}
            </span>
          );
        },
      },
      {
        accessorKey: "enrollmentDate",
        header: "Matrícula",
        size: 110,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.enrollmentDate)}
          </span>
        ),
      },
      {
        id: "graduation",
        header: "Graduação",
        size: 150,
        cell: ({ row }) => {
          const s = row.original;
          if (!s.belt) return <span className="text-sm text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col gap-1">
              <BeltVisual
                beltKey={beltKeyFromName(s.belt.name)}
                degrees={s.currentDegree}
                size="swatch"
              />
              <span className="text-xs text-muted-foreground">
                {s.belt.name} · {s.currentDegree}º grau
              </span>
            </div>
          );
        },
      },
      {
        id: "billing",
        header: "Mensalidade",
        size: 160,
        cell: ({ row }) => {
          const s = row.original;
          if (s.monthlyAmountInCents === null && s.monthlyDueDay === null) {
            return (
              <div>
                <span className="text-sm text-muted-foreground">Sem mensalidade</span>
              </div>
            );
          }
          return <span className="text-sm text-foreground">{billingLabel(s)}</span>;
        },
      },
      {
        id: "actions",
        header: "",
        size: 100,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => openEditForm(s)}>
                Editar
              </Button>
              <OverflowMenu
                student={s}
                onGenerateInvite={() => inviteMutation.mutate(s.id)}
                onRevokeInvite={(inviteId) =>
                  revokeInviteMutation.mutate({ studentId: s.id, inviteId })
                }
                onRevokeAccess={() => revokeAccessMutation.mutate(s.id)}
                onInactivate={() => statusMutation.mutate({ id: s.id, action: "inactivate" })}
                onReactivate={() => statusMutation.mutate({ id: s.id, action: "reactivate" })}
              />
            </div>
          );
        },
      },
    ],
    [statusMutation, inviteMutation, revokeInviteMutation, revokeAccessMutation, openEditForm],
  );

  const serverPagination = studentsQuery.data?.pagination;

  const table = useReactTable({
    data: students,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: serverPagination?.totalPages ?? -1,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  function openCreateForm() {
    setEditingStudent(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingStudent(null);
  }

  return (
    <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Alunos</h1>
            {summary && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {status === "active"
                  ? summary.active
                  : status === "inactive"
                    ? summary.inactive
                    : summary.total}
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Cadastre alunos, responsáveis, dados de mensalidade e graduação.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <UploadCloud className="size-4" /> Importar CSV
          </Button>
          <Button onClick={openCreateForm}>
            <PlusCircle className="size-4" /> Novo aluno
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === "students" || value === "pre-registrations") {
            setActiveTab(value);
          }
        }}
      >
        <TabsList className="w-full overflow-x-auto sm:w-auto">
          <TabsTrigger value="students" className="flex-1 sm:flex-none">
            Alunos
          </TabsTrigger>
          <TabsTrigger value="pre-registrations" className="flex-1 sm:flex-none">
            Pré-cadastros
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "pre-registrations" ? <PreRegistrationsTab /> : null}

      {activeTab === "students" ? (
        <>
          <StudentCsvImport
            open={isImportOpen}
            onOpenChange={setIsImportOpen}
            onImportComplete={() => {
              void queryClient.invalidateQueries({
                queryKey: academyQueryKey(activeAcademyId, "students"),
              });
            }}
          />
          <StudentForm
            {...(editingStudent ? { student: editingStudent } : {})}
            belts={beltsQuery.data?.belts ?? []}
            open={isFormOpen}
            onSubmit={() => {
              void queryClient.invalidateQueries({
                queryKey: academyQueryKey(activeAcademyId, "students"),
              });
            }}
            onClose={closeForm}
          />

          {/* Filters + Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              <StatusFilterButton
                label="Ativos"
                count={summary?.active ?? 0}
                active={status === "active"}
                onClick={() => {
                  setStatus("active");
                  setSearch("");
                  setPagination((p) => ({ ...p, pageIndex: 0 }));
                }}
              />
              <StatusFilterButton
                label="Inativos"
                count={summary?.inactive ?? 0}
                active={status === "inactive"}
                onClick={() => {
                  setStatus("inactive");
                  setSearch("");
                  setPagination((p) => ({ ...p, pageIndex: 0 }));
                }}
              />
              <StatusFilterButton
                label="Todos"
                count={summary?.total ?? 0}
                active={status === "all"}
                onClick={() => {
                  setStatus("all");
                  setSearch("");
                  setPagination((p) => ({ ...p, pageIndex: 0 }));
                }}
              />
            </div>
            <div className="relative sm:ml-auto sm:w-64">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome..."
                className="h-9 w-full rounded-[12px] border border-border bg-background pl-3 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Content */}
          {studentsQuery.isError ? (
            <ErrorState onRetry={() => studentsQuery.refetch()} />
          ) : studentsQuery.isLoading ? (
            <LoadingSkeleton />
          ) : !hasAnyStudents && !search ? (
            <StudentsEmptyState onCreate={openCreateForm} onImport={() => setIsImportOpen(true)} />
          ) : noResults ? (
            <NoResultsState query={search} onClear={() => setSearch("")} />
          ) : (
            <DataGridContainer className="overflow-x-auto">
              <DataGrid
                table={table}
                recordCount={serverPagination?.total ?? students.length}
                isLoading={false}
                emptyMessage="Nenhum aluno encontrado."
                tableLayout={{ headerSticky: true }}
                tableClassNames={{ base: "min-w-[760px]", edgeCell: "px-4" }}
              >
                <DataGridTable />
                <DataGridPagination
                  className="min-w-[760px] px-4 py-2"
                  rowsPerPageLabel="Linhas por página"
                  info="{from} - {to} de {count}"
                  sizes={[10, 25, 50, 100]}
                />
              </DataGrid>
            </DataGridContainer>
          )}
        </>
      ) : null}
    </div>
  );
}

function OverflowMenu({
  student,
  onGenerateInvite,
  onRevokeInvite,
  onRevokeAccess,
  onInactivate,
  onReactivate,
}: {
  student: Student;
  onGenerateInvite: () => void;
  onRevokeInvite: (inviteId: string) => void;
  onRevokeAccess: () => void;
  onInactivate: () => void;
  onReactivate: () => void;
}) {
  const access = student.accessState;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="ghost" size="sm" aria-label="Mais ações">
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {student.status === "active" && access.status !== "active" && (
          <DropdownMenuItem onClick={onGenerateInvite}>
            {access.status === "expired" ? "Gerar novo convite" : "Gerar convite"}
          </DropdownMenuItem>
        )}
        {access.status === "pending" && access.inviteId && (
          <DropdownMenuItem onClick={() => onRevokeInvite(access.inviteId as string)}>
            Revogar convite
          </DropdownMenuItem>
        )}
        {access.status === "active" && (
          <DropdownMenuItem onClick={onRevokeAccess}>Revogar acesso</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {student.status === "active" ? (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onInactivate}
          >
            Inativar aluno
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onReactivate}>Reativar aluno</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusFilterButton(props: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-[12px] border px-3 text-sm font-medium transition ${
        props.active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary/50"
      }`}
    >
      {props.label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-xs ${
          props.active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
        }`}
      >
        {props.count}
      </span>
    </button>
  );
}

function StudentsEmptyState(props: { onCreate: () => void; onImport: () => void }) {
  return (
    <div className="grid place-items-center rounded-[14px] border border-dashed border-border p-10 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-muted text-primary">
        <PlusCircle className="size-7" />
      </div>
      <h2 className="font-semibold text-foreground">Nenhum aluno por aqui ainda</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Comece cadastrando o primeiro aluno ou importe uma lista existente.
      </p>
      <div className="mt-5 flex gap-2">
        <Button variant="outline" onClick={props.onImport}>
          <UploadCloud className="size-4" /> Importar CSV
        </Button>
        <Button onClick={props.onCreate}>
          <PlusCircle className="size-4" /> Cadastrar aluno
        </Button>
      </div>
    </div>
  );
}

function NoResultsState(props: { query: string; onClear: () => void }) {
  return (
    <div className="grid place-items-center rounded-[14px] border border-dashed border-border p-10 text-center">
      <p className="text-sm text-muted-foreground">
        Nenhum resultado para <strong>"{props.query}"</strong>
      </p>
      <button
        type="button"
        onClick={props.onClear}
        className="mt-2 text-sm font-medium text-primary hover:underline"
      >
        Limpar busca
      </button>
    </div>
  );
}

function ErrorState(props: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-[14px] border border-destructive/20 bg-destructive/5 p-10 text-center">
      <AlertCircle className="mb-3 size-8 text-destructive" />
      <p className="text-sm font-medium text-destructive">Não foi possível carregar alunos.</p>
      <button
        type="button"
        onClick={props.onRetry}
        className="mt-3 text-sm font-medium text-primary hover:underline"
      >
        Tentar novamente
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 rounded-[14px] border border-border p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: decorative skeleton rows
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="size-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-10 w-20 rounded-[10px]" />
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-8 w-14 rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}
