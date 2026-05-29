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
import { authClient } from "../../lib/auth-client";
import { getPlatformMe, listPlatformAuditLogs, type PlatformAuditLogEntry } from "./platform-api";
import { PlatformShell } from "./platform-shell";

const ACTION_LABELS: Record<string, string> = {
  "platform.dashboard.viewed": "Dashboard visualizado",
  "platform.academy.provisioned": "Academia provisionada",
  "platform.academy.transferred": "Academia transferida",
  "platform.user.banned": "Usuário bloqueado",
  "platform.user.unbanned": "Usuário desbloqueado",
  "platform.user.sessions_revoked": "Sessões revogadas",
  "platform.user.deleted": "Usuário excluído",
  "platform.user.deleted_preserving_history": "Usuário excluído (preservando histórico)",
  "platform.admin.added": "Admin adicionado",
  "platform.admin.removed": "Admin removido",
  "platform.first_access_link.generated": "Link de primeiro acesso gerado",
  "platform.first_access_link.regenerated": "Link de primeiro acesso regenerado",
  "platform.sensitive_file.accessed": "Arquivo sensível acessado",
  "platform.support.started": "Suporte assistido iniciado",
  "platform.support.ended": "Suporte assistido encerrado",
};

export function PlatformAuditPage() {
  const navigate = useNavigate();
  const [actionFilter, setActionFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });

  const platform = useQuery({
    queryKey: ["platform", "me"],
    queryFn: getPlatformMe,
    retry: false,
  });

  const audit = useQuery({
    queryKey: ["platform", "audit", actionFilter, pagination.pageIndex, pagination.pageSize],
    queryFn: () =>
      listPlatformAuditLogs({
        ...(actionFilter ? { action: actionFilter } : {}),
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
      }),
    retry: false,
  });

  if (platform.isLoading) return null;
  if (platform.isError) return <Navigate to="/choose-area" />;

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
          <h2 className="mt-2 font-semibold text-2xl">Auditoria Administrativa</h2>
          <p className="text-muted-foreground text-sm">
            Registro de ações sensíveis realizadas por administradores.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Registros de Auditoria</CardTitle>
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              <option value="">Todas as ações</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <AuditDataGrid
            entries={audit.data?.items ?? []}
            loading={audit.isLoading}
            pagination={pagination}
            onPaginationChange={setPagination}
            rowCount={audit.data?.pagination.total ?? 0}
            pageCount={audit.data?.pagination.totalPages ?? -1}
          />
        </CardContent>
      </Card>
    </PlatformShell>
  );
}

function AuditDataGrid({
  entries,
  loading,
  pagination,
  onPaginationChange,
  rowCount,
  pageCount,
}: {
  entries: PlatformAuditLogEntry[];
  loading: boolean;
  pagination: PaginationState;
  onPaginationChange: Dispatch<SetStateAction<PaginationState>>;
  rowCount: number;
  pageCount: number;
}) {
  const columns = useMemo<ColumnDef<PlatformAuditLogEntry>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Data",
        size: 170,
        cell: ({ row }) => (
          <span className="text-xs">{formatDateTime(row.original.createdAt)}</span>
        ),
      },
      {
        id: "admin",
        header: "Administrador",
        size: 260,
        cell: ({ row }) => (
          <div>
            <p className="text-sm">{row.original.adminName ?? "—"}</p>
            <p className="text-muted-foreground text-xs">{row.original.adminEmail ?? "—"}</p>
          </div>
        ),
      },
      {
        accessorKey: "action",
        header: "Ação",
        size: 260,
        cell: ({ row }) => (
          <Badge variant="muted">{ACTION_LABELS[row.original.action] ?? row.original.action}</Badge>
        ),
      },
      {
        id: "target",
        header: "Alvo",
        size: 220,
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.targetType}
            {row.original.targetId ? (
              <span className="block text-muted-foreground text-xs">{row.original.targetId}</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "result",
        header: "Resultado",
        size: 130,
        cell: ({ row }) => (
          <Badge variant={row.original.result === "success" ? "default" : "warning"}>
            {row.original.result}
          </Badge>
        ),
      },
      {
        accessorKey: "reason",
        header: "Motivo",
        size: 240,
        cell: ({ row }) => (
          <span className="block truncate text-muted-foreground text-sm">
            {row.original.reason ?? "—"}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: entries,
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
        emptyMessage="Nenhum registro encontrado."
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
          sizes={[10, 20, 50]}
        />
      </DataGrid>
    </DataGridContainer>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
