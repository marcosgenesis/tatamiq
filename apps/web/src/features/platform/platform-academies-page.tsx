import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowRight01Icon } from "hugeicons-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { DataGrid, DataGridContainer } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Badge } from "../../components/ui/badge";
import { authClient } from "../../lib/auth-client";
import {
  AcademyAvatar,
  formatDate,
  ProvisionAcademyDialog,
  SearchInput,
} from "./platform-components";
import {
  type PlatformAcademySummary,
  platformAcademiesQuery,
  platformMeQuery,
} from "./platform-queries";
import { PlatformLoading, PlatformShell } from "./platform-shell";

export function PlatformAcademiesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const session = authClient.useSession();
  const platform = useQuery({
    ...platformMeQuery(session.data?.user.id),
    enabled: !!session.data?.user.id,
  });
  const academies = useQuery(
    platformAcademiesQuery(query, pagination.pageIndex, pagination.pageSize),
  );

  if (session.isPending || platform.isLoading)
    return <PlatformLoading label="Carregando academias..." />;
  if (platform.isError || !platform.data?.user) return <Navigate to="/choose-area" />;

  return (
    <PlatformShell
      user={platform.data.user}
      onSignOut={() => authClient.signOut().then(() => navigate({ to: "/sign-in" }))}
      title="Academias"
      description="Tenants ativos na plataforma"
      actions={<ProvisionAcademyDialog />}
    >
      <div className="space-y-4">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPagination((c) => ({ ...c, pageIndex: 0 }));
          }}
          placeholder="Buscar academia por nome ou slug"
        />
        <AcademiesDataGrid
          academies={academies.data?.items ?? []}
          loading={academies.isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          rowCount={academies.data?.pagination.total ?? 0}
          pageCount={academies.data?.pagination.totalPages ?? -1}
        />
      </div>
    </PlatformShell>
  );
}

function AcademiesDataGrid({
  academies,
  loading,
  pagination,
  onPaginationChange,
  rowCount,
  pageCount,
}: {
  academies: PlatformAcademySummary[];
  loading: boolean;
  pagination: PaginationState;
  onPaginationChange: Dispatch<SetStateAction<PaginationState>>;
  rowCount: number;
  pageCount: number;
}) {
  const columns = useMemo<ColumnDef<PlatformAcademySummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Academia",
        size: 320,
        cell: ({ row }) => (
          <Link
            to="/platform/academies/$academyId"
            params={{ academyId: row.original.id }}
            className="flex items-center gap-3"
          >
            <AcademyAvatar name={row.original.name} logo={row.original.logo} />
            <div className="min-w-0">
              <p className="font-semibold text-foreground hover:underline">{row.original.name}</p>
              <p className="truncate text-muted-foreground text-xs">/{row.original.slug}</p>
            </div>
          </Link>
        ),
      },
      {
        id: "owner",
        header: "Dono",
        size: 280,
        cell: ({ row }) =>
          row.original.owner ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.original.owner.name}</p>
              <p className="truncate text-muted-foreground text-xs">{row.original.owner.email}</p>
            </div>
          ) : (
            <Badge variant="muted">Sem dono</Badge>
          ),
      },
      {
        accessorKey: "createdAt",
        header: "Criada em",
        size: 140,
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
              to="/platform/academies/$academyId"
              params={{ academyId: row.original.id }}
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
    data: academies,
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
        emptyMessage="Nenhuma academia encontrada."
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
