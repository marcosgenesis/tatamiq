import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import type { components } from "@tatamiq/contracts/generated";
import { ArrowRight01Icon } from "hugeicons-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { DataGrid, DataGridContainer } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { authClient } from "../../lib/auth-client";
import { formatDate, getInitials, SearchInput } from "./platform-components";
import { platformMeQuery, platformUsersQuery } from "./platform-queries";
import { PlatformLoading, PlatformShell } from "./platform-shell";

type PlatformUserSummary = components["schemas"]["PlatformUserSummaryDto"];

export function PlatformUsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id;
  const platform = useQuery({
    ...platformMeQuery(sessionUserId),
    enabled: !!sessionUserId,
  });
  const users = useQuery(
    platformUsersQuery(sessionUserId, query, pagination.pageIndex, pagination.pageSize),
  );

  if (session.isPending || platform.isLoading)
    return <PlatformLoading label="Carregando usuários..." />;
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
      title="Usuários"
      description="Contas de toda a plataforma"
    >
      <div className="space-y-4">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPagination((c) => ({ ...c, pageIndex: 0 }));
          }}
          placeholder="Buscar usuário por nome ou e-mail"
        />
        <UsersDataGrid
          users={users.data?.items ?? []}
          loading={users.isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          rowCount={users.data?.pagination.total ?? 0}
          pageCount={users.data?.pagination.totalPages ?? -1}
        />
      </div>
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
        size: 340,
        cell: ({ row }) => (
          <Link
            to="/platform/users/$userId"
            params={{ userId: row.original.id }}
            className="flex items-center gap-3"
          >
            <Avatar className="size-9 rounded-xl">
              <AvatarImage src={row.original.image ?? undefined} />
              <AvatarFallback className="rounded-xl bg-muted text-xs font-semibold text-foreground/70">
                {getInitials(row.original.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground hover:underline">
                {row.original.name}
              </p>
              <p className="truncate text-muted-foreground text-xs">{row.original.email}</p>
            </div>
          </Link>
        ),
      },
      {
        accessorKey: "role",
        header: "Papel",
        size: 140,
        cell: ({ row }) =>
          row.original.role === "admin" ? (
            <Badge variant="warning">Operador</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">Usuário</span>
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
        accessorKey: "createdAt",
        header: "Cadastro",
        size: 130,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 60,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Link
              to="/platform/users/$userId"
              params={{ userId: row.original.id }}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Abrir ${row.original.name}`}
            >
              <ArrowRight01Icon className="size-4" />
            </Link>
          </div>
        ),
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
    <DataGridContainer className="rounded-2xl bg-card">
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
