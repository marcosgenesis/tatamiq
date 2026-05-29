import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { authClient } from "../../lib/auth-client";
import { getPlatformMe, listPlatformUsers, type PlatformUserSummary } from "./platform-api";
import { PlatformLoading, PlatformShell } from "./platform-shell";

export function PlatformUsersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const platform = useQuery({
    queryKey: ["platform", "me"],
    queryFn: getPlatformMe,
    retry: false,
  });

  const users = useQuery({
    queryKey: ["platform", "users", query, page],
    queryFn: () => listPlatformUsers(query, page),
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
                setPage(0);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {users.isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : (users.data?.items.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum usuário encontrado.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.data?.items.map((u) => (
                    <UserRow key={u.id} user={u} />
                  ))}
                </TableBody>
              </Table>

              {users.data && users.data.pagination.totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Página {users.data.pagination.page + 1} de {users.data.pagination.totalPages} (
                    {users.data.pagination.total} usuários)
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
                      disabled={page >= users.data.pagination.totalPages - 1}
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

function UserRow({ user }: { user: PlatformUserSummary }) {
  return (
    <TableRow>
      <TableCell>
        <Link
          to="/platform/users/$userId"
          params={{ userId: user.id }}
          className="font-medium hover:underline"
        >
          {user.name}
        </Link>
        <p className="text-muted-foreground text-xs">{user.email}</p>
      </TableCell>
      <TableCell>
        {user.banned ? (
          <Badge variant="warning">Bloqueado</Badge>
        ) : (
          <Badge variant="default">Ativo</Badge>
        )}
      </TableCell>
      <TableCell>
        {user.role === "admin" ? (
          <Badge variant="muted">Admin</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Usuário</span>
        )}
      </TableCell>
      <TableCell className="text-sm">
        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(user.createdAt))}
      </TableCell>
    </TableRow>
  );
}
