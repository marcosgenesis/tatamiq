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
  banPlatformUser,
  getPlatformMe,
  getPlatformUser,
  revokePlatformUserSessions,
  unbanPlatformUser,
} from "./platform-api";
import { PlatformLoading, PlatformShell } from "./platform-shell";

export function PlatformUserDetailPage({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [banReason, setBanReason] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);

  const platform = useQuery({
    queryKey: ["platform", "me"],
    queryFn: getPlatformMe,
    retry: false,
  });

  const userDetail = useQuery({
    queryKey: ["platform", "users", userId],
    queryFn: () => getPlatformUser(userId),
    retry: false,
  });

  const banMutation = useMutation({
    mutationFn: () => banPlatformUser(userId, banReason || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "users"] });
      setShowBanForm(false);
      setBanReason("");
    },
  });

  const unbanMutation = useMutation({
    mutationFn: () => unbanPlatformUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "users"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => revokePlatformUserSessions(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "users"] });
    },
  });

  if (platform.isLoading || userDetail.isLoading) {
    return <PlatformLoading label="Carregando usuário..." />;
  }

  if (platform.isError) return <Navigate to="/choose-area" />;

  const adminUser = platform.data?.user;
  if (!adminUser) return <Navigate to="/choose-area" />;

  if (userDetail.isError || !userDetail.data) {
    return (
      <PlatformShell
        user={adminUser}
        onSignOut={() => authClient.signOut().then(() => navigate({ to: "/sign-in" }))}
      >
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Usuário não encontrado.</p>
          </CardContent>
        </Card>
      </PlatformShell>
    );
  }

  const detail = userDetail.data;
  const ownsAcademy = detail.memberships.some((m) => m.role === "owner");

  return (
    <PlatformShell
      user={adminUser}
      onSignOut={() => authClient.signOut().then(() => navigate({ to: "/sign-in" }))}
    >
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/platform/users"
            className="text-muted-foreground text-sm hover:text-foreground"
          >
            ← Voltar para Usuários
          </Link>
          <h2 className="mt-2 font-semibold text-2xl">{detail.name}</h2>
          <p className="text-muted-foreground text-sm">{detail.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {detail.role === "admin" ? <Badge variant="muted">Admin</Badge> : null}
          {detail.banned ? (
            <Badge variant="warning">Bloqueado</Badge>
          ) : (
            <Badge variant="default">Ativo</Badge>
          )}
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados do Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Nome" value={detail.name} />
            <DetailRow label="Email" value={detail.email} />
            <DetailRow label="Email verificado" value={detail.emailVerified ? "Sim" : "Não"} />
            <DetailRow label="Papel" value={detail.role ?? "Usuário"} />
            <DetailRow label="Sessões ativas" value={String(detail.activeSessions)} />
            <DetailRow
              label="Cadastrado em"
              value={new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
                new Date(detail.createdAt),
              )}
            />
            {detail.banned ? (
              <DetailRow
                label="Motivo do bloqueio"
                value={detail.banReason ?? "Sem motivo informado"}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.banned ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Este usuário está bloqueado. Desbloqueie para restaurar o acesso.
                </p>
                <Button
                  variant="outline"
                  onClick={() => unbanMutation.mutate()}
                  disabled={unbanMutation.isPending}
                >
                  {unbanMutation.isPending ? "Desbloqueando..." : "Desbloquear usuário"}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {ownsAcademy ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-sm font-medium">Atenção: este usuário é dono de academia</p>
                    <p className="text-xs text-muted-foreground">
                      Bloquear este usuário impedirá o acesso à academia que ele possui.
                    </p>
                  </div>
                ) : null}

                {showBanForm ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Motivo do bloqueio (opcional)"
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        onClick={() => banMutation.mutate()}
                        disabled={banMutation.isPending}
                      >
                        {banMutation.isPending ? "Bloqueando..." : "Confirmar bloqueio"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBanForm(false);
                          setBanReason("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setShowBanForm(true)}>
                    Bloquear usuário
                  </Button>
                )}
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Revogar sessões desconecta o usuário de todos os dispositivos.
              </p>
              <Button
                variant="outline"
                onClick={() => revokeMutation.mutate()}
                disabled={revokeMutation.isPending || detail.activeSessions === 0}
              >
                {revokeMutation.isPending
                  ? "Revogando..."
                  : `Revogar sessões (${detail.activeSessions})`}
              </Button>
            </div>

            {banMutation.isError ? (
              <p className="text-sm text-red-600">Erro ao bloquear usuário.</p>
            ) : null}
            {unbanMutation.isError ? (
              <p className="text-sm text-red-600">Erro ao desbloquear usuário.</p>
            ) : null}
            {revokeMutation.isError ? (
              <p className="text-sm text-red-600">Erro ao revogar sessões.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {detail.memberships.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Academias (membro)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Academia</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Membro desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.memberships.map((m) => (
                  <TableRow key={m.memberId}>
                    <TableCell>
                      <Link
                        to="/platform/academies/$academyId"
                        params={{ academyId: m.organizationId }}
                        className="font-medium hover:underline"
                      >
                        {m.organizationName}
                      </Link>
                      <p className="text-muted-foreground text-xs">/{m.organizationSlug}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.role === "owner" ? "default" : "muted"}>{m.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
                        new Date(m.createdAt),
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {detail.studentAccessLinks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Acesso de Aluno</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Academia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vinculado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.studentAccessLinks.map((sa) => (
                  <TableRow key={sa.id}>
                    <TableCell className="font-medium">{sa.studentName}</TableCell>
                    <TableCell>
                      <Link
                        to="/platform/academies/$academyId"
                        params={{ academyId: sa.organizationId }}
                        className="hover:underline"
                      >
                        {sa.organizationName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sa.status === "active" ? "default" : "muted"}>
                        {sa.status === "active" ? "Ativo" : sa.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
                        new Date(sa.createdAt),
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </PlatformShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
