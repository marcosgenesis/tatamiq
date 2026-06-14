import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  getCoreRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import type { Student } from "@tatamiq/contracts";
import { PlusSignIcon, UserMultipleIcon } from "hugeicons-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import { DataGrid, DataGridContainer } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/reui/tabs";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import { useBelts } from "../../hooks/use-belts";
import { useStudents } from "../../hooks/use-students";
import { ageLabel, billingLabel, formatDate } from "../../lib/formatting";
import { StudentCsvImport } from "./components/student-csv-import";
import { StudentForm } from "./components/student-form";
import { PreRegistrationsTab } from "./pre-registrations-tab";

type StudentStatusFilter = "active" | "inactive" | "all";
type StudentsTab = "students" | "pre-registrations";
export function StudentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<StudentsTab>("students");
  const [status, setStatus] = useState<StudentStatusFilter>("active");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const beltsQuery = useBelts();
  const studentsQuery = useStudents(status, {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
  });

  const inviteMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await api.POST("/students/{id}/access-invites", {
        params: { path: { id: studentId } },
      });
      if (error) throw new Error("Não foi possível gerar convite.");
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
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
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await api.POST("/students/{id}/access/revoke", {
        params: { path: { id: studentId } },
      });
      if (error) throw new Error("Não foi possível revogar acesso.");
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["students"] }),
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
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });

  const [isImportOpen, setIsImportOpen] = useState(false);

  const students = studentsQuery.data?.students ?? [];
  const summary = studentsQuery.data?.summary;
  const hasAnyStudents = (summary?.total ?? 0) > 0;

  const openEditForm = useCallback((student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Aluno",
        size: 280,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div>
              <strong>{s.name}</strong>
              <p className="mt-1 text-sm text-muted-foreground">
                {ageLabel(s.birthDate)} · {s.phone ?? "Sem telefone"}
              </p>
              {s.guardian ? (
                <p className="text-xs text-muted-foreground">Resp.: {s.guardian.name}</p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        cell: ({ row }) => (
          <Badge variant={row.original.status === "active" ? "success-light" : "destructive-light"}>
            {row.original.status === "active" ? "Ativo" : "Inativo"}
          </Badge>
        ),
      },
      {
        accessorKey: "enrollmentDate",
        header: "Matrícula",
        size: 120,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.enrollmentDate)}
          </span>
        ),
      },
      {
        id: "graduation",
        header: "Graduação",
        size: 120,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.belt?.name ?? "—"} · {row.original.currentDegree}º
          </span>
        ),
      },
      {
        id: "billing",
        header: "Mensalidade",
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{billingLabel(row.original)}</span>
        ),
      },
      {
        id: "actions",
        header: "Ações",
        size: 200,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => openEditForm(s)}>
                Editar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() =>
                  statusMutation.mutate({
                    id: s.id,
                    action: s.status === "active" ? "inactivate" : "reactivate",
                  })
                }
              >
                {s.status === "active" ? "Inativar" : "Reativar"}
              </Button>
              <AccessActions
                student={s}
                onGenerateInvite={() => inviteMutation.mutate(s.id)}
                onRevokeInvite={(inviteId) =>
                  revokeInviteMutation.mutate({ studentId: s.id, inviteId })
                }
                onRevokeAccess={() => revokeAccessMutation.mutate(s.id)}
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
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl">Alunos</h1>{" "}
            <Badge variant={"primary-light"}>{students.length}</Badge>
          </div>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Cadastre alunos, responsáveis, dados de mensalidade e graduação inicial da academia.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 min-[480px]:grid-cols-3 sm:w-auto sm:flex sm:flex-wrap sm:justify-end">
          <StudentCsvImport
            open={isImportOpen}
            onOpenChange={setIsImportOpen}
            onImportComplete={() => {
              void queryClient.invalidateQueries({ queryKey: ["students"] });
            }}
          />
          <Button onClick={openCreateForm} className="justify-center">
            <PlusSignIcon className="size-4" /> Novo aluno
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
          <StudentForm
            {...(editingStudent ? { student: editingStudent } : {})}
            belts={beltsQuery.data?.belts ?? []}
            open={isFormOpen}
            onSubmit={() => {
              void queryClient.invalidateQueries({ queryKey: ["students"] });
            }}
            onClose={closeForm}
          />

          <div className="flex flex-wrap gap-2">
            <StatusFilterButton
              label="Ativos"
              count={summary?.active ?? 0}
              active={status === "active"}
              onClick={() => {
                setStatus("active");
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            />
            <StatusFilterButton
              label="Inativos"
              count={summary?.inactive ?? 0}
              active={status === "inactive"}
              onClick={() => {
                setStatus("inactive");
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            />
            <StatusFilterButton
              label="Todos"
              count={summary?.total ?? 0}
              active={status === "all"}
              onClick={() => {
                setStatus("all");
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            />
          </div>

          <div>
            {studentsQuery.isError ? (
              <p className="text-sm text-destructive">Não foi possível carregar alunos.</p>
            ) : null}
            {!studentsQuery.isLoading && !hasAnyStudents ? (
              <StudentsEmptyState onCreate={openCreateForm} />
            ) : null}
            {hasAnyStudents || studentsQuery.isLoading ? (
              <DataGridContainer className="overflow-x-auto">
                <DataGrid
                  table={table}
                  recordCount={serverPagination?.total ?? students.length}
                  isLoading={studentsQuery.isLoading}
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
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function AccessActions(props: {
  student: Student;
  onGenerateInvite: () => void;
  onRevokeInvite: (inviteId: string) => void;
  onRevokeAccess: () => void;
}) {
  const access = props.student.accessState;

  if (props.student.status === "inactive") {
    return <span className="text-xs text-muted-foreground">Sem convite para inativo</span>;
  }

  if (access.status === "active") {
    return (
      <Button type="button" variant="destructive" size="sm" onClick={props.onRevokeAccess}>
        Revogar acesso
      </Button>
    );
  }

  if (access.status === "pending" && access.inviteId) {
    return (
      <>
        <Button type="button" variant="secondary" size="sm" onClick={props.onGenerateInvite}>
          Gerar novo link
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => props.onRevokeInvite(access.inviteId as string)}
        >
          Revogar convite
        </Button>
      </>
    );
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={props.onGenerateInvite}>
      {access.status === "expired" ? "Gerar novo convite" : "Gerar convite"}
    </Button>
  );
}

function StatusFilterButton(props: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant={props.active ? "default" : "outline"} onClick={props.onClick}>
      {props.label}
      <Badge variant={props.active ? "primary-light" : "secondary"}>{props.count}</Badge>
    </Button>
  );
}

function StudentsEmptyState(props: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border p-10 text-center">
      <div className="grid size-14 place-items-center rounded-3xl bg-muted text-primary">
        <UserMultipleIcon className="size-7" />
      </div>
      <h2 className="mt-4 font-semibold">Nenhum aluno por aqui ainda</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Comece cadastrando o primeiro aluno da academia.
      </p>
      <Button className="mt-5" onClick={props.onCreate}>
        Cadastrar aluno
      </Button>
    </div>
  );
}
