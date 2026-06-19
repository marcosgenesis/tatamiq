import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { Download04Icon } from "hugeicons-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { DataGrid, DataGridContainer } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { authClient } from "../../lib/auth-client";
import { ACTION_LABELS, ActionTag, actionLabel, formatDateTime } from "./platform-components";
import {
  type PlatformAuditLogEntry,
  platformAuditQuery,
  platformMeQuery,
} from "./platform-queries";
import { PlatformLoading, PlatformShell } from "./platform-shell";

function exportCsv(entries: PlatformAuditLogEntry[]) {
  const header = [
    "Data",
    "Ação",
    "Responsável",
    "E-mail",
    "Alvo",
    "ID alvo",
    "Academia",
    "Resultado",
    "Motivo",
  ];
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = entries.map((e) =>
    [
      formatDateTime(e.createdAt),
      actionLabel(e.action),
      e.adminName ?? "",
      e.adminEmail ?? "",
      e.targetType,
      e.targetId ?? "",
      e.academyId ?? "",
      e.result,
      e.reason ?? "",
    ]
      .map((v) => quote(String(v)))
      .join(","),
  );
  const csv = [header.map(quote).join(","), ...rows].join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "auditoria-tatamiq.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function PlatformAuditPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionFilter, setActionFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });

  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id;
  const platform = useQuery({
    ...platformMeQuery(sessionUserId),
    enabled: !!sessionUserId,
  });
  const audit = useQuery(
    platformAuditQuery(sessionUserId, actionFilter, pagination.pageIndex, pagination.pageSize),
  );

  if (session.isPending || platform.isLoading)
    return <PlatformLoading label="Carregando auditoria..." />;
  if (platform.isError || !platform.data?.user) return <Navigate to="/choose-area" />;

  const entries = (audit.data?.items ?? []) as PlatformAuditLogEntry[];

  return (
    <PlatformShell
      user={platform.data.user}
      onSignOut={() =>
        authClient.signOut().then(() => {
          queryClient.clear();
          return navigate({ to: "/sign-in" });
        })
      }
      title="Auditoria"
      description="Registro de ações sensíveis"
      actions={
        <Button
          variant="outline"
          size="sm"
          disabled={entries.length === 0}
          onClick={() => exportCsv(entries)}
        >
          <Download04Icon className="size-4" />
          Exportar log
        </Button>
      }
    >
      <div className="space-y-4">
        <Select
          value={actionFilter || "all"}
          onValueChange={(value) => {
            setActionFilter(!value || value === "all" ? "" : value);
            setPagination((c) => ({ ...c, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="h-10 w-full max-w-xs rounded-xl">
            <SelectValue placeholder="Todas as ações" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <AuditDataGrid
          entries={entries}
          loading={audit.isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          rowCount={audit.data?.pagination.total ?? 0}
          pageCount={audit.data?.pagination.totalPages ?? -1}
        />
      </div>
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
        accessorKey: "action",
        header: "Ação",
        size: 240,
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium">{actionLabel(row.original.action)}</p>
            <ActionTag action={row.original.action} />
          </div>
        ),
      },
      {
        id: "admin",
        header: "Responsável",
        size: 220,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm">{row.original.adminName ?? "—"}</p>
            <p className="truncate text-muted-foreground text-xs">
              {row.original.adminEmail ?? "—"}
            </p>
          </div>
        ),
      },
      {
        id: "target",
        header: "Alvo",
        size: 200,
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.targetType}
            {row.original.targetId ? (
              <span className="block truncate font-mono text-muted-foreground text-xs">
                {row.original.targetId}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "result",
        header: "Resultado",
        size: 120,
        cell: ({ row }) => (
          <Badge variant={row.original.result === "success" ? "success" : "destructive"}>
            {row.original.result === "success" ? "Sucesso" : row.original.result}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Quando",
        size: 160,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {formatDateTime(row.original.createdAt)}
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
    <DataGridContainer className="rounded-2xl bg-card">
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
