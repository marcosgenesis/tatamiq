import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { DataGrid, DataGridContainer } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { authClient } from "../../lib/auth-client";
import {
  type AddPlatformAdministratorInput,
  addPlatformAdministrator,
  type PlatformAdministrator,
  platformAdministratorsQuery,
  platformMeQuery,
  removePlatformAdministrator,
} from "./platform-queries";
import { PlatformLoading, PlatformShell } from "./platform-shell";

export function PlatformAdministratorsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: "", name: "" });
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const platform = useQuery(platformMeQuery());
  const administrators = useQuery(
    platformAdministratorsQuery(pagination.pageIndex, pagination.pageSize),
  );
  const addAdmin = useMutation({
    mutationFn: (input: AddPlatformAdministratorInput) => addPlatformAdministrator(input),
    onSuccess: async () => {
      setForm({ email: "", name: "" });
      setPagination((current) => ({ ...current, pageIndex: 0 }));
      await queryClient.invalidateQueries({ queryKey: ["platform", "administrators"] });
    },
  });
  const removeAdmin = useMutation({
    mutationFn: (id: string) => removePlatformAdministrator(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "administrators"] });
    },
  });

  if (platform.isLoading) return <PlatformLoading label="Carregando administradores..." />;
  if (platform.isError || !platform.data?.user) return <Navigate to="/choose-area" />;

  return (
    <PlatformShell
      user={platform.data.user}
      onSignOut={() => authClient.signOut().then(() => navigate({ to: "/sign-in" }))}
    >
      <div>
        <Link to="/platform" className="text-muted-foreground text-sm hover:text-foreground">
          ← Voltar para Administração da Plataforma
        </Link>
        <h2 className="mt-2 font-semibold text-2xl">Administradores da Plataforma</h2>
        <p className="text-muted-foreground text-sm">
          Gerencie quem tem permissão global no Tatamiq.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar administrador</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              addAdmin.mutate({ email: form.email, ...(form.name ? { name: form.name } : {}) });
            }}
          >
            <Input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <Input
              placeholder="Nome"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Button type="submit" disabled={addAdmin.isPending}>
              {addAdmin.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </form>
          {addAdmin.data?.firstAccessLink ? (
            <div className="mt-4 rounded-lg border bg-background p-3 text-sm">
              <p className="font-medium">Link de primeiro acesso</p>
              <p className="break-all text-muted-foreground">{addAdmin.data.firstAccessLink}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admins atuais</CardTitle>
        </CardHeader>
        <CardContent>
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
            <p className="mt-3 text-destructive text-sm">
              Não foi possível remover este administrador. O último admin ativo não pode ser
              removido.
            </p>
          ) : null}
        </CardContent>
      </Card>
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
        header: "Usuário",
        size: 320,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-xs">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: "configured",
        header: "Origem",
        size: 160,
        cell: ({ row }) => (
          <Badge variant={row.original.configured ? "warning" : "muted"}>
            {row.original.configured ? "Configuração" : "Role admin"}
          </Badge>
        ),
      },
      {
        accessorKey: "banned",
        header: "Status",
        size: 120,
        cell: ({ row }) => (row.original.banned ? "Bloqueado" : "Ativo"),
      },
      {
        id: "actions",
        header: "Ações",
        size: 180,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              disabled={row.original.configured || removing}
              onClick={() => onRemove(row.original.id)}
            >
              Remover admin
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
    <DataGridContainer>
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
