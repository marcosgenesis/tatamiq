import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import type { components } from "@tatamiq/contracts/generated";
import { Delete02Icon, HeadphonesIcon } from "hugeicons-react";
import { type ReactNode, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { authClient } from "../../lib/auth-client";
import { formatLongDate, getInitials } from "./platform-components";
import {
  banPlatformUser,
  deletePlatformUser,
  platformMeQuery,
  platformUserDeletionImpactQuery,
  platformUserQuery,
  queuePlatformSupportActivation,
  revokePlatformUserSessions,
  startPlatformSupport,
  unbanPlatformUser,
} from "./platform-queries";
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

  const platform = useQuery(platformMeQuery());
  const userDetail = useQuery(platformUserQuery(userId));
  const deletionImpact = useQuery(platformUserDeletionImpactQuery(userId, showDeleteForm));

  const banMutation = useMutation({
    mutationFn: async () =>
      banPlatformUser({ userId, ...(banReason ? { reason: banReason } : {}) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "users"] });
      setShowBanForm(false);
      setBanReason("");
    },
  });
  const unbanMutation = useMutation({
    mutationFn: async () => unbanPlatformUser(userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["platform", "users"] }),
  });
  const revokeMutation = useMutation({
    mutationFn: async () => revokePlatformUserSessions(userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["platform", "users"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: async () => deletePlatformUser({ userId, ...deleteForm }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "users"] });
      await navigate({ to: "/platform/users" });
    },
  });
  const supportMutation = useMutation({
    mutationFn: async () => {
      const prepared = await startPlatformSupport({
        targetUserId: userId,
        ...(supportReason ? { reason: supportReason } : {}),
      });
      const impersonation = await authClient.admin.impersonateUser({ userId });
      if (impersonation.error)
        throw new Error(impersonation.error.message ?? "Erro ao iniciar suporte.");
      queuePlatformSupportActivation(prepared.id);
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/choose-area";
    },
  });

  if (platform.isLoading || userDetail.isLoading) {
    return <PlatformLoading label="Carregando usuário..." />;
  }
  if (platform.isError || !platform.data?.user) return <Navigate to="/choose-area" />;
  const adminUser = platform.data.user;

  if (userDetail.isError || !userDetail.data) {
    return (
      <PlatformShell
        user={adminUser}
        onSignOut={() => authClient.signOut().then(() => navigate({ to: "/sign-in" }))}
        breadcrumb={[{ label: "Usuários", to: "/platform/users" }, { label: "Não encontrado" }]}
      >
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Usuário não encontrado.
        </p>
      </PlatformShell>
    );
  }

  const detail = userDetail.data as PlatformUserDetail;
  const isPlatformAdmin = isSupportBlockedForPlatformUser(detail);
  const ownsAcademy = detail.memberships.some((m) => m.role === "owner");
  const impact = deletionImpact.data as PlatformUserDeletionImpact | undefined;
  const blocksUserDestructiveActions = isPlatformAdmin || impact?.isPlatformAdmin === true;

  return (
    <PlatformShell
      user={adminUser}
      onSignOut={() => authClient.signOut().then(() => navigate({ to: "/sign-in" }))}
      breadcrumb={[{ label: "Usuários", to: "/platform/users" }, { label: detail.name }]}
    >
      <div className="space-y-6">
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
          <Avatar className="size-16 rounded-2xl">
            <AvatarImage src={detail.image ?? undefined} />
            <AvatarFallback className="rounded-2xl bg-muted text-lg font-semibold text-foreground/70">
              {getInitials(detail.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight">{detail.name}</h1>
            <p className="truncate text-sm text-muted-foreground">{detail.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isPlatformAdmin ? <Badge variant="warning">Administrador da Plataforma</Badge> : null}
            {detail.banned ? (
              <Badge variant="destructive">Bloqueado</Badge>
            ) : (
              <Badge variant="success">Ativo</Badge>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <Panel title="Conta">
              <dl className="divide-y divide-border">
                <DetailRow
                  label="ID do usuário"
                  value={<span className="font-mono text-xs">{detail.id}</span>}
                />
                <DetailRow
                  label="Papel"
                  value={isPlatformAdmin ? "Administrador da plataforma" : "Usuário"}
                />
                <DetailRow label="E-mail verificado" value={detail.emailVerified ? "Sim" : "Não"} />
                <DetailRow label="Sessões ativas" value={String(detail.activeSessions)} />
                <DetailRow label="Cadastrado em" value={formatLongDate(detail.createdAt)} />
                {detail.banned ? (
                  <DetailRow label="Motivo do bloqueio" value={detail.banReason ?? "Sem motivo"} />
                ) : null}
              </dl>
            </Panel>

            {detail.memberships.length > 0 ? (
              <Panel title="Academias (membro)">
                <div className="divide-y divide-border">
                  {detail.memberships.map((m: PlatformUserMembership) => (
                    <div
                      key={m.memberId}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <Link
                          to="/platform/academies/$academyId"
                          params={{ academyId: m.organizationId }}
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {m.organizationName}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          /{m.organizationSlug}
                        </p>
                      </div>
                      <Badge variant={m.role === "owner" ? "warning" : "muted"}>
                        {m.role === "owner" ? "Dono" : m.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            {detail.studentAccessLinks.length > 0 ? (
              <Panel title="Acesso de aluno">
                <div className="divide-y divide-border">
                  {detail.studentAccessLinks.map((sa: PlatformUserStudentAccess) => (
                    <div key={sa.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{sa.studentName}</p>
                        <Link
                          to="/platform/academies/$academyId"
                          params={{ academyId: sa.organizationId }}
                          className="truncate text-xs text-muted-foreground hover:underline"
                        >
                          {sa.organizationName}
                        </Link>
                      </div>
                      <Badge variant={sa.status === "active" ? "success" : "muted"}>
                        {sa.status === "active" ? "Ativo" : sa.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
          </div>

          <div className="space-y-6">
            <Panel title="Suporte assistido">
              <div className="space-y-3 p-5">
                <p className="text-sm text-muted-foreground">
                  Entra como este usuário por até 1 hora. Operadores não podem ser alvo.
                </p>
                <Input
                  placeholder="Motivo do suporte (opcional)"
                  value={supportReason}
                  onChange={(event) => setSupportReason(event.target.value)}
                  disabled={isPlatformAdmin || supportMutation.isPending}
                />
                <Button
                  className="w-full"
                  onClick={() => supportMutation.mutate()}
                  disabled={isPlatformAdmin || supportMutation.isPending}
                >
                  <HeadphonesIcon className="size-4" />
                  {supportMutation.isPending ? "Iniciando..." : "Iniciar suporte"}
                </Button>
                {supportMutation.isError ? (
                  <p className="text-destructive text-sm">Erro ao iniciar suporte.</p>
                ) : null}
              </div>
            </Panel>

            <Panel title="Sessões e acesso">
              <div className="space-y-4 p-5">
                {detail.banned ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => unbanMutation.mutate()}
                    disabled={unbanMutation.isPending}
                  >
                    {unbanMutation.isPending ? "Desbloqueando..." : "Desbloquear usuário"}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {blocksUserDestructiveActions ? (
                      <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                        Administradores da Plataforma não podem ser bloqueados por esta tela.
                      </p>
                    ) : null}
                    {ownsAcademy ? (
                      <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                        Este usuário é dono de academia. Bloquear impede o acesso à academia dele.
                      </p>
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
                            onClick={() => banMutation.mutate()}
                            disabled={blocksUserDestructiveActions || banMutation.isPending}
                          >
                            {banMutation.isPending ? "Bloqueando..." : "Confirmar"}
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
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowBanForm(true)}
                        disabled={blocksUserDestructiveActions}
                      >
                        Bloquear usuário
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => revokeMutation.mutate()}
                  disabled={revokeMutation.isPending || detail.activeSessions === 0}
                >
                  {revokeMutation.isPending
                    ? "Revogando..."
                    : `Revogar sessões (${detail.activeSessions})`}
                </Button>
                {banMutation.isError || unbanMutation.isError || revokeMutation.isError ? (
                  <p className="text-destructive text-sm">Não foi possível concluir a ação.</p>
                ) : null}
              </div>
            </Panel>

            <section className="overflow-hidden rounded-2xl border border-destructive/30 bg-card shadow-sm">
              <header className="border-b border-destructive/20 bg-destructive/5 px-5 py-4">
                <h2 className="text-[0.95rem] font-bold tracking-tight text-destructive">
                  Zona de perigo
                </h2>
              </header>
              <div className="space-y-3 p-5">
                <p className="text-sm text-muted-foreground">
                  Exclua definitivamente ou preservando o histórico operacional.
                </p>
                {isPlatformAdmin ? (
                  <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                    Administradores da Plataforma são protegidos contra exclusão por este fluxo.
                  </p>
                ) : null}
                {showDeleteForm ? (
                  <div className="space-y-3">
                    {impact ? (
                      <div className="space-y-0.5 rounded-xl bg-muted/50 p-3 text-xs">
                        <p>Vínculos de academia: {impact.memberships}</p>
                        <p>Acessos de aluno: {impact.studentAccessLinks}</p>
                        <p>Sessões ativas: {impact.activeSessions}</p>
                        {impact.ownedAcademies.length > 0 ? (
                          <p className="font-medium text-primary">
                            Dono de {impact.ownedAcademies.length} academia(s).
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <select
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                      value={deleteForm.mode}
                      onChange={(event) =>
                        setDeleteForm((c) => ({
                          ...c,
                          mode: event.target.value as DeletePlatformUserInput["mode"],
                        }))
                      }
                    >
                      <option value="preserve_history">Excluir preservando histórico</option>
                      <option value="definitive">Excluir definitivamente</option>
                    </select>
                    {impact?.ownedAcademies.some((a) => a.isOnlyOwner) ? (
                      <div className="space-y-2">
                        <select
                          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                          value={deleteForm.ownerResolution ?? ""}
                          onChange={(event) => {
                            const value = event.target.value as
                              | DeletePlatformUserInput["ownerResolution"]
                              | "";
                            setDeleteForm((c) => {
                              if (!value) {
                                const { ownerResolution: _o, ...rest } = c;
                                return rest;
                              }
                              return { ...c, ownerResolution: value };
                            });
                          }}
                        >
                          <option value="">O que fazer com a academia?</option>
                          <option value="keep_ownerless">Manter sem dono</option>
                          <option value="transfer">Transferir antes de excluir</option>
                        </select>
                        {deleteForm.ownerResolution === "transfer" ? (
                          <>
                            <Input
                              type="email"
                              placeholder="E-mail do novo dono"
                              value={deleteForm.transferOwnerEmail ?? ""}
                              onChange={(event) =>
                                setDeleteForm((c) => ({
                                  ...c,
                                  transferOwnerEmail: event.target.value,
                                }))
                              }
                            />
                            <Input
                              placeholder="Nome do novo dono"
                              value={deleteForm.transferOwnerName ?? ""}
                              onChange={(event) =>
                                setDeleteForm((c) => ({
                                  ...c,
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
                        disabled={blocksUserDestructiveActions || deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? "Excluindo..." : "Confirmar exclusão"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowDeleteForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowDeleteForm(true)}
                    disabled={blocksUserDestructiveActions}
                  >
                    <Delete02Icon className="size-4" />
                    Excluir usuário
                  </Button>
                )}
                {deleteMutation.isError ? (
                  <p className="text-destructive text-sm">Erro ao excluir usuário.</p>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </PlatformShell>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-[0.95rem] font-bold tracking-tight">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export function isSupportBlockedForPlatformUser(user: {
  role: string | null;
  isPlatformAdmin?: boolean;
}) {
  return user.isPlatformAdmin === true || user.role === "admin";
}
