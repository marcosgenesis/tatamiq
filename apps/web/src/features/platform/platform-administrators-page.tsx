import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { PlusSignIcon, ShieldUserIcon } from "hugeicons-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { DataGrid, DataGridContainer } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { authClient } from "../../lib/auth-client";
import { getInitials } from "./platform-components";
import {
  type AddPlatformAdministratorInput,
  addPlatformAdministrator,
  type PlatformAdministrator,
  platformAdministratorsQuery,
  platformKeys,
  platformMeQuery,
  removePlatformAdministrator,
} from "./platform-queries";
import { PlatformLoading, PlatformShell } from "./platform-shell";

export function PlatformAdministratorsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "" });
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id;
  const platform = useQuery({
    ...platformMeQuery(sessionUserId),
    enabled: !!sessionUserId,
  });
  const administrators = useQuery(
    platformAdministratorsQuery(sessionUserId, pagination.pageIndex, pagination.pageSize),
  );
  const addAdmin = useMutation({
    mutationFn: (input: AddPlatformAdministratorInput) => addPlatformAdministrator(input),
    onSuccess: async () => {
      setForm({ email: "", name: "" });
      setPagination((c) => ({ ...c, pageIndex: 0 }));
      await queryClient.invalidateQueries({ queryKey: platformKeys.administratorsRoot() });
    },
  });
  const removeAdmin = useMutation({
    mutationFn: (id: string) => removePlatformAdministrator(id),
    onSuccess: async () =>
      queryClient.invalidateQueries({ queryKey: platformKeys.administratorsRoot() }),
  });

  if (session.isPending || platform.isLoading)
    return <PlatformLoading label="Carregando administradores..." />;
  if (platform.isError || !platform.data?.user) return <Navigate to="/choose-area" />;

  return (
    <PlatformShell
      user={platform.data.user}
      onSignOut={() =>
        authClient.signOut().then(() => {
          queryClient.clear();
          return navigate({ to: "/sign-in" });
        })
      }
      title="Administradores"
      description="Quem opera a plataforma"
      actions={
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                addAdmin.reset();
                setForm({ email: "", name: "" });
              }}
            >
              <PlusSignIcon className="size-4" />
              Adicionar administrador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar administrador</DialogTitle>
              <DialogDescription>
                Conceda acesso global a uma conta existente ou crie uma conta reservada com link de
                primeiro acesso.
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                addAdmin.mutate({ email: form.email, ...(form.name ? { name: form.name } : {}) });
              }}
            >
              <Input
                required
                type="email"
                placeholder="E-mail"
                value={form.email}
                onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))}
              />
              <Input
                placeholder="Nome (opcional)"
                value={form.name}
                onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
              />
              {addAdmin.data?.firstAccessLink ? (
                <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">Link de primeiro acesso</p>
                  <p className="mt-1 break-all text-muted-foreground">
                    {addAdmin.data.firstAccessLink}
                  </p>
                </div>
              ) : null}
              {addAdmin.data && !addAdmin.data.firstAccessLink ? (
                <p className="text-muted-foreground text-sm">
                  Administrador adicionado a uma conta existente.
                </p>
              ) : null}
              {addAdmin.isError ? (
                <p className="text-destructive text-sm">
                  Não foi possível adicionar este administrador.
                </p>
              ) : null}
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={addAdmin.isPending}>
                  {addAdmin.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
          <ShieldUserIcon className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <p className="text-sm text-violet-900 dark:text-violet-200">
            Administradores têm acesso total à plataforma: academias, usuários, suporte assistido e
            auditoria. Conceda com cautela.
          </p>
        </div>

        <AdministratorsDataGrid
          administrators={administrators.data?.items ?? []}
          loading={administrators.isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          rowCount={administrators.data?.pagination.total ?? 0}
          pageCount={administrators.data?.pagination.totalPages ?? -1}
          removing={removeAdmin.isPending}
          onRemove={(adminId) => removeAdmin.mutate(adminId)}
        />
        {removeAdmin.isError ? (
          <p className="text-destructive text-sm">
            Não foi possível remover. O último administrador ativo não pode ser removido.
          </p>
        ) : null}
      </div>
    </PlatformShell>
  );
}

function AdministratorsDataGrid({
  administrators,
  loading,
  pagination,
  onPaginationChange,
  rowCount,
  pageCount,
  removing,
  onRemove,
}: {
  administrators: PlatformAdministrator[];
  loading: boolean;
  pagination: PaginationState;
  onPaginationChange: Dispatch<SetStateAction<PaginationState>>;
  rowCount: number;
  pageCount: number;
  removing: boolean;
  onRemove: (adminId: string) => void;
}) {
  const columns = useMemo<ColumnDef<PlatformAdministrator>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Administrador",
        size: 320,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-9 rounded-xl">
              <AvatarFallback className="rounded-xl bg-muted text-xs font-semibold text-foreground/70">
                {getInitials(row.original.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold">{row.original.name}</p>
              <p className="truncate text-muted-foreground text-xs">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "configured",
        header: "Acesso",
        size: 160,
        cell: ({ row }) => (
          <Badge variant={row.original.configured ? "warning" : "muted"}>
            {row.original.configured ? "Proprietário" : "Administrador"}
          </Badge>
        ),
      },
      {
        accessorKey: "banned",
        header: "Status",
        size: 120,
        cell: ({ row }) =>
          row.original.banned ? (
            <Badge variant="destructive">Bloqueado</Badge>
          ) : (
            <Badge variant="success">Ativo</Badge>
          ),
      },
      {
        id: "actions",
        header: "",
        size: 140,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={row.original.configured || removing}
              onClick={() => onRemove(row.original.id)}
            >
              Remover
            </Button>
          </div>
        ),
      },
    ],
    [onRemove, removing],
  );

  const table = useReactTable({
    data: administrators,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination },
    onPaginationChange,
  });

  return (
    <DataGridContainer className="rounded-2xl bg-card">
      <DataGrid
        table={table}
        recordCount={rowCount}
        isLoading={loading}
        emptyMessage="Nenhum administrador encontrado."
        tableLayout={{ headerSticky: true }}
        tableClassNames={{ edgeCell: "px-4" }}
      >
        <DataGridTable />
        <DataGridPagination
          className="border-border border-t px-4 py-3 sm:py-3"
          rowsPerPageLabel="Linhas por página"
          previousPageLabel="Página anterior"
          nextPageLabel="Próxima página"
          info="{from} - {to} de {count}"
          sizes={[10, 25, 50]}
        />
      </DataGrid>
    </DataGridContainer>
  );
}
