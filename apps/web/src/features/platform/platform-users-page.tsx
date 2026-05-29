import { useQuery } from "@tanstack/react-query";
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
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { authClient } from "../../lib/auth-client";
import { getPlatformMe, listPlatformUsers, type PlatformUserSummary } from "./platform-api";
import { PlatformLoading, PlatformShell } from "./platform-shell";

export function PlatformUsersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const platform = useQuery({
    queryKey: ["platform", "me"],
    queryFn: getPlatformMe,
    retry: false,
  });

  const users = useQuery({
    queryKey: ["platform", "users", query, pagination.pageIndex, pagination.pageSize],
    queryFn: () => listPlatformUsers(query, pagination.pageIndex, pagination.pageSize),
    retry: false,
  });

  if (platform.isLoading) {
    return <PlatformLoading label="Carregando..." />;
  }

  if (platform.isError) {
    return <Navigate to="/choose-area" />;
  }

  const user = platform.data?.user;
  if (!user) return <Navigate to="/choose-area" />;

  return (
    <PlatformShell
      user={user}
      onSignOut={() => authClient.signOut().then(() => navigate({ to: "/sign-in" }))}
    >
      <div className="flex items-center justify-between">
        <div>
          <Link to="/platform" className="text-muted-foreground text-sm hover:text-foreground">
            ← Voltar para Administração da Plataforma
          </Link>
          <h2 className="mt-2 font-semibold text-2xl">Usuários</h2>
          <p className="text-muted-foreground text-sm">
            Busque por nome ou email. Clique em um usuário para ver detalhes.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Lista de Usuários</CardTitle>
            <Input
              className="sm:max-w-xs"
              placeholder="Buscar por nome ou email..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <UsersDataGrid
            users={users.data?.items ?? []}
            loading={users.isLoading}
            pagination={pagination}
            onPaginationChange={setPagination}
            rowCount={users.data?.pagination.total ?? 0}
            pageCount={users.data?.pagination.totalPages ?? -1}
          />
        </CardContent>
      </Card>
    </PlatformShell>
  );
}

function UsersDataGrid({
  users,
  loading,
  pagination,
  onPaginationChange,
  rowCount,
  pageCount,
}: {
  users: PlatformUserSummary[];
  loading: boolean;
  pagination: PaginationState;
  onPaginationChange: Dispatch<SetStateAction<PaginationState>>;
  rowCount: number;
  pageCount: number;
}) {
  const columns = useMemo<ColumnDef<PlatformUserSummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Usuário",
        size: 320,
        cell: ({ row }) => (
          <div>
            <Link
              to="/platform/users/$userId"
              params={{ userId: row.original.id }}
              className="font-medium hover:underline"
            >
              {row.original.name}
            </Link>
            <p className="text-muted-foreground text-xs">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: "banned",
        header: "Status",
        size: 120,
        cell: ({ row }) =>
          row.original.banned ? (
            <Badge variant="warning">Bloqueado</Badge>
          ) : (
            <Badge variant="default">Ativo</Badge>
          ),
      },
      {
        accessorKey: "role",
        header: "Papel",
        size: 140,
        cell: ({ row }) =>
          row.original.role === "admin" ? (
            <Badge variant="muted">Admin</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">Usuário</span>
          ),
      },
      {
        accessorKey: "createdAt",
        header: "Cadastrado em",
        size: 160,
        cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: users,
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
        emptyMessage="Nenhum usuário encontrado."
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}
