import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { ArrowRight01Icon, ShieldUserIcon } from "hugeicons-react";
import { Skeleton } from "../../components/ui/skeleton";
import { authClient } from "../../lib/auth-client";
import {
  AcademyAvatar,
  ActionDot,
  actionLabel,
  formatAcademyResponsiblesSummary,
  formatDate,
  formatRelative,
  ProvisionAcademyDialog,
  STAT_ICONS,
  StatCard,
} from "./platform-components";
import {
  type PlatformAcademySummary,
  type PlatformAuditLogEntry,
  platformAuditQuery,
  platformDashboardQuery,
  platformMeQuery,
} from "./platform-queries";
import { PlatformLoading, PlatformShell } from "./platform-shell";

export function PlatformPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id;
  const platform = useQuery({
    ...platformMeQuery(sessionUserId),
    enabled: !!sessionUserId,
  });
  const dashboard = useQuery(platformDashboardQuery(sessionUserId));
  const activity = useQuery(platformAuditQuery(sessionUserId, "", 0, 7));

  if (session.isPending || platform.isLoading) {
    return <PlatformLoading label="Carregando console do operador..." />;
  }
  if (platform.isError || !platform.data?.user) {
    return <Navigate to="/choose-area" />;
  }

  const totals = dashboard.data?.totals;
  const recent = (dashboard.data?.recentAcademies ?? []) as PlatformAcademySummary[];
  const entries = (activity.data?.items ?? []) as PlatformAuditLogEntry[];

  return (
    <PlatformShell
      user={platform.data.user}
      onSignOut={() =>
        authClient.signOut().then(() => {
          queryClient.clear();
          return navigate({ to: "/sign-in" });
        })
      }
      title="Visão geral"
      description="Operação da plataforma"
      actions={<ProvisionAcademyDialog />}
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={STAT_ICONS.academies}
            label="Academias"
            value={totals?.academies ?? 0}
            loading={dashboard.isLoading}
          />
          <StatCard
            icon={STAT_ICONS.users}
            label="Usuários"
            value={totals?.users ?? 0}
            loading={dashboard.isLoading}
          />
          <StatCard
            icon={STAT_ICONS.admins}
            label="Administradores"
            value={totals?.admins ?? 0}
            loading={dashboard.isLoading}
          />
          <StatCard
            icon={ShieldUserIcon}
            label="Usuários bloqueados"
            value={totals?.bannedUsers ?? 0}
            loading={dashboard.isLoading}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl border border-border bg-card shadow-sm">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-[0.95rem] font-bold tracking-tight">Academias recentes</h2>
              <Link
                to="/platform/academies"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Ver todas
                <ArrowRight01Icon className="size-3.5" />
              </Link>
            </header>
            <div className="divide-y divide-border">
              {dashboard.isLoading ? (
                <RowSkeletons rows={4} />
              ) : recent.length === 0 ? (
                <EmptyRow message="Nenhuma academia ainda." />
              ) : (
                recent.map((academy) => (
                  <Link
                    key={academy.id}
                    to="/platform/academies/$academyId"
                    params={{ academyId: academy.id }}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                  >
                    <AcademyAvatar name={academy.name} logo={academy.logo} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{academy.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatAcademyResponsiblesSummary(academy.responsibles) ===
                        "Sem responsável"
                          ? `Sem responsável · /${academy.slug}`
                          : formatAcademyResponsiblesSummary(academy.responsibles)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(academy.createdAt)}
                    </span>
                    <ArrowRight01Icon className="size-4 shrink-0 text-muted-foreground/50" />
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card shadow-sm">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-[0.95rem] font-bold tracking-tight">Atividade recente</h2>
              <Link
                to="/platform/audit"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Auditoria
                <ArrowRight01Icon className="size-3.5" />
              </Link>
            </header>
            <div className="divide-y divide-border">
              {activity.isLoading ? (
                <RowSkeletons rows={5} />
              ) : entries.length === 0 ? (
                <EmptyRow message="Nenhuma atividade registrada." />
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                    <ActionDot action={entry.action} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">
                        {actionLabel(entry.action)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {entry.adminName ?? entry.adminEmail ?? "Sistema"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelative(entry.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </PlatformShell>
  );
}

const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6"];

function RowSkeletons({ rows }: { rows: number }) {
  return (
    <>
      {SKELETON_KEYS.slice(0, rows).map((key) => (
        <div key={key} className="flex items-center gap-3 px-5 py-3">
          <Skeleton className="size-9 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{message}</p>;
}
