import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import type { components } from "@tatamiq/contracts/generated";
import { useState } from "react";
import { api } from "../../api";
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
import { PlatformLoading, PlatformShell } from "./platform-shell";

type PlatformUserDetail = components["schemas"]["PlatformUserDetailDto"];
type PlatformUserMembership = components["schemas"]["PlatformUserMembershipDto"];
type PlatformUserStudentAccess = components["schemas"]["PlatformUserStudentAccessDto"];
type PlatformUserDeletionImpact = components["schemas"]["PlatformUserDeletionImpactDto"];

type DeletePlatformUserInput = {
  mode: "definitive" | "preserve_history";
  ownerResolution?: "keep_ownerless" | "transfer";
  transferOwnerEmail?: string;
  transferOwnerName?: string;
};

export function PlatformUserDetailPage({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [banReason, setBanReason] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [supportReason, setSupportReason] = useState("");
  const [deleteForm, setDeleteForm] = useState<DeletePlatformUserInput>({
    mode: "preserve_history",
  });

  const platform = useQuery({
    queryKey: ["platform", "me"],
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/me");
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  const userDetail = useQuery({
    queryKey: ["platform", "users", userId],
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/users/{id}", {
        params: { path: { id: userId } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  const deletionImpact = useQuery({
    queryKey: ["platform", "users", userId, "deletion-impact"],
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/users/{id}/deletion-impact", {
        params: { path: { id: userId } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
    enabled: showDeleteForm,
  });

  const banMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/platform/users/{id}/ban", {
        params: { path: { id: userId } },
        body: banReason ? { reason: banReason } : {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "users"] });
      setShowBanForm(false);
      setBanReason("");
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/platform/users/{id}/unban", {
        params: { path: { id: userId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "users"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/platform/users/{id}/revoke-sessions", {
        params: { path: { id: userId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/platform/users/{id}/delete", {
        params: { path: { id: userId } },
        body: deleteForm,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "users"] });
      await navigate({ to: "/platform/users" });
    },
  });

  const supportMutation = useMutation({
    mutationFn: async () => {
      const { data: prepared, error: prepareError } = await api.POST("/platform/support/start", {
        body: {
          targetUserId: userId,
          ...(supportReason ? { reason: supportReason } : {}),
        },
      });
      if (prepareError) throw prepareError;
      const impersonation = await authClient.admin.impersonateUser({ userId });
      if (impersonation.error)
        throw new Error(impersonation.error.message ?? "Erro ao iniciar suporte.");
      try {
        const { error: activateError } = await api.POST("/platform/support/activate", {
          body: { supportSessionId: prepared.id },
        });
        if (activateError) throw activateError;
      } catch {
        await authClient.admin.stopImpersonating();
        throw new Error("Erro ao ativar suporte.");
      }
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/choose-area";
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

  const detail = userDetail.data as PlatformUserDetail;
  const ownsAcademy = detail.memberships.some((m: PlatformUserMembership) => m.role === "owner");

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

            <div className="space-y-2 border-t pt-4">
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

            <div className="space-y-3 border-t pt-4">
              <div>
                <p className="font-medium text-sm">Suporte Assistido</p>
                <p className="text-muted-foreground text-sm">
                  Entra temporariamente como este usuário por até 1 hora. Administradores não podem
                  ser alvo.
                </p>
              </div>
              <Input
                placeholder="Motivo do suporte (opcional)"
                value={supportReason}
                onChange={(event) => setSupportReason(event.target.value)}
                disabled={detail.role === "admin" || supportMutation.isPending}
              />
              <Button
                variant="outline"
                onClick={() => supportMutation.mutate()}
                disabled={detail.role === "admin" || supportMutation.isPending}
              >
                {supportMutation.isPending ? "Iniciando..." : "Iniciar Suporte Assistido"}
              </Button>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div>
                <p className="font-medium text-sm">Exclusão de Usuário</p>
                <p className="text-muted-foreground text-sm">
                  Escolha entre exclusão definitiva ou exclusão preservando histórico.
                </p>
              </div>
              {showDeleteForm ? (
                <div className="space-y-3 rounded-lg border p-3">
                  {deletionImpact.data ? (
                    <div className="space-y-1 text-sm">
                      <p>Vínculos de academia: {deletionImpact.data.memberships}</p>
                      <p>Acessos de aluno: {deletionImpact.data.studentAccessLinks}</p>
                      <p>Sessões ativas: {deletionImpact.data.activeSessions}</p>
                      {deletionImpact.data.ownedAcademies.length > 0 ? (
                        <p className="text-primary">
                          Dono de {deletionImpact.data.ownedAcademies.length} academia(s).
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <select
                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                    value={deleteForm.mode}
                    onChange={(event) =>
                      setDeleteForm((current) => ({
                        ...current,
                        mode: event.target.value as DeletePlatformUserInput["mode"],
                      }))
                    }
                  >
                    <option value="preserve_history">Excluir preservando histórico</option>
                    <option value="definitive">Excluir definitivamente</option>
                  </select>

                  {(
                    deletionImpact.data as PlatformUserDeletionImpact | undefined
                  )?.ownedAcademies.some((academy) => academy.isOnlyOwner) ? (
                    <div className="space-y-2">
                      <select
                        className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                        value={deleteForm.ownerResolution ?? ""}
                        onChange={(event) => {
                          const value = event.target.value as
                            | DeletePlatformUserInput["ownerResolution"]
                            | "";
                          setDeleteForm((current) => {
                            if (!value) {
                              const { ownerResolution: _ownerResolution, ...rest } = current;
                              return rest;
                            }
                            return { ...current, ownerResolution: value };
                          });
                        }}
                      >
                        <option value="">Escolha o que fazer com a academia</option>
                        <option value="keep_ownerless">Manter academia sem dono</option>
                        <option value="transfer">Transferir antes de excluir</option>
                      </select>
                      {deleteForm.ownerResolution === "transfer" ? (
                        <>
                          <Input
                            type="email"
                            placeholder="Email do novo dono"
                            value={deleteForm.transferOwnerEmail ?? ""}
                            onChange={(event) =>
                              setDeleteForm((current) => ({
                                ...current,
                                transferOwnerEmail: event.target.value,
                              }))
                            }
                          />
                          <Input
                            placeholder="Nome do novo dono"
                            value={deleteForm.transferOwnerName ?? ""}
                            onChange={(event) =>
                              setDeleteForm((current) => ({
                                ...current,
                                transferOwnerName: event.target.value,
                              }))
                            }
                          />
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? "Excluindo..." : "Confirmar exclusão"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowDeleteForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="destructive" onClick={() => setShowDeleteForm(true)}>
                  Excluir usuário
                </Button>
              )}
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
            {deleteMutation.isError ? (
              <p className="text-sm text-red-600">Erro ao excluir usuário.</p>
            ) : null}
            {supportMutation.isError ? (
              <p className="text-sm text-red-600">Erro ao iniciar Suporte Assistido.</p>
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
                {detail.memberships.map((m: PlatformUserMembership) => (
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
                {detail.studentAccessLinks.map((sa: PlatformUserStudentAccess) => (
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
