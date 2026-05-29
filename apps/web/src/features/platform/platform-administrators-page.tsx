import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  addPlatformAdministrator,
  getPlatformMe,
  listPlatformAdministrators,
  removePlatformAdministrator,
} from "./platform-api";
import { PlatformLoading, PlatformShell } from "./platform-shell";

export function PlatformAdministratorsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: "", name: "" });
  const platform = useQuery({ queryKey: ["platform", "me"], queryFn: getPlatformMe, retry: false });
  const administrators = useQuery({
    queryKey: ["platform", "administrators"],
    queryFn: listPlatformAdministrators,
    retry: false,
  });
  const addAdmin = useMutation({
    mutationFn: addPlatformAdministrator,
    onSuccess: async () => {
      setForm({ email: "", name: "" });
      await queryClient.invalidateQueries({ queryKey: ["platform", "administrators"] });
    },
  });
  const removeAdmin = useMutation({
    mutationFn: removePlatformAdministrator,
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
          {administrators.isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : null}
          {administrators.data ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {administrators.data.items.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <p className="font-medium">{admin.name}</p>
                      <p className="text-muted-foreground text-xs">{admin.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.configured ? "warning" : "muted"}>
                        {admin.configured ? "Configuração" : "Role admin"}
                      </Badge>
                    </TableCell>
                    <TableCell>{admin.banned ? "Bloqueado" : "Ativo"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={admin.configured || removeAdmin.isPending}
                        onClick={() => removeAdmin.mutate(admin.id)}
                      >
                        Remover admin
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
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
