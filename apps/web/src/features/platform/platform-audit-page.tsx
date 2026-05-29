import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
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
  const [page, setPage] = useState(0);

  const platform = useQuery({
    queryKey: ["platform", "me"],
    queryFn: getPlatformMe,
    retry: false,
  });

  const audit = useQuery({
    queryKey: ["platform", "audit", actionFilter, page],
    queryFn: () =>
      listPlatformAuditLogs({
        ...(actionFilter ? { action: actionFilter } : {}),
        page,
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
                setPage(0);
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
          {audit.isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : (audit.data?.items.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum registro encontrado.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Administrador</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Alvo</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.data?.items.map((entry) => (
                    <AuditRow key={entry.id} entry={entry} />
                  ))}
                </TableBody>
              </Table>

              {audit.data && audit.data.pagination.totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Página {audit.data.pagination.page + 1} de {audit.data.pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= audit.data.pagination.totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </PlatformShell>
  );
}

function AuditRow({ entry }: { entry: PlatformAuditLogEntry }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-xs">
        {new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(entry.createdAt))}
      </TableCell>
      <TableCell>
        <p className="text-sm">{entry.adminName ?? "—"}</p>
        <p className="text-muted-foreground text-xs">{entry.adminEmail ?? "—"}</p>
      </TableCell>
      <TableCell>
        <Badge variant="muted">{ACTION_LABELS[entry.action] ?? entry.action}</Badge>
      </TableCell>
      <TableCell className="text-sm">
        {entry.targetType}
        {entry.targetId ? (
          <span className="text-muted-foreground text-xs block">{entry.targetId}</span>
        ) : null}
      </TableCell>
      <TableCell>
        <Badge variant={entry.result === "success" ? "default" : "warning"}>{entry.result}</Badge>
      </TableCell>
      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
        {entry.reason ?? "—"}
      </TableCell>
    </TableRow>
  );
}
