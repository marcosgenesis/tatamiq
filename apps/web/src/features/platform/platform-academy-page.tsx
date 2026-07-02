import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { Delete02Icon, HeadphonesIcon, MapPinIcon, PlusSignIcon } from "hugeicons-react";
import { type ReactNode, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { authClient } from "../../lib/auth-client";
import { AcademyAvatar, formatDate } from "./platform-components";
import {
  addPlatformAcademyResponsible,
  impersonateWithPendingPlatformSupportActivation,
  type PlatformAcademyOperationalOverview,
  platformAcademyOperationalOverviewQuery,
  platformAcademyQuery,
  platformKeys,
  platformMeQuery,
  removePlatformAcademyResponsible,
  startPlatformSupport,
} from "./platform-queries";
import { PlatformLoading, PlatformShell } from "./platform-shell";

export function PlatformAcademyPage({ academyId }: { academyId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [supportReason, setSupportReason] = useState("");
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isAddResponsibleOpen, setIsAddResponsibleOpen] = useState(false);
  const [responsibleForm, setResponsibleForm] = useState({ ownerEmail: "", ownerName: "" });

  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id;
  const platform = useQuery({
    ...platformMeQuery(sessionUserId),
    enabled: !!sessionUserId,
  });
  const academy = useQuery(platformAcademyQuery(sessionUserId, academyId));
  const operational = useQuery(platformAcademyOperationalOverviewQuery(sessionUserId, academyId));

  const addResponsible = useMutation({
    mutationFn: async () =>
      addPlatformAcademyResponsible({
        academyId,
        ownerEmail: responsibleForm.ownerEmail,
        ...(responsibleForm.ownerName ? { ownerName: responsibleForm.ownerName } : {}),
      }),
    onSuccess: async () => {
      setResponsibleForm({ ownerEmail: "", ownerName: "" });
      setIsAddResponsibleOpen(false);
      await queryClient.invalidateQueries({
        queryKey: platformKeys.academy(sessionUserId, academyId),
      });
      await queryClient.invalidateQueries({ queryKey: ["platform", "academies"] });
    },
  });

  const removeResponsible = useMutation({
    mutationFn: async (target: { userId: string; allowLeavingOwnerless?: boolean }) =>
      removePlatformAcademyResponsible({
        academyId,
        userId: target.userId,
        ...(target.allowLeavingOwnerless ? { allowLeavingOwnerless: true } : {}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: platformKeys.academy(sessionUserId, academyId),
      });
      await queryClient.invalidateQueries({ queryKey: ["platform", "academies"] });
    },
  });

  const support = useMutation({
    mutationFn: async () => {
      const targetResponsible = academy.data?.responsibles?.[0];
      if (!targetResponsible) throw new Error("Academia sem responsável.");
      const prepared = await startPlatformSupport({
        targetUserId: targetResponsible.id,
        academyId,
        ...(supportReason ? { reason: supportReason } : {}),
      });
      await impersonateWithPendingPlatformSupportActivation({
        supportSessionId: prepared.id,
        userId: targetResponsible.id,
        impersonateUser: authClient.admin.impersonateUser,
      });
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/choose-area";
    },
  });

  if (session.isPending || platform.isLoading || academy.isLoading) {
    return <PlatformLoading label="Carregando academia..." />;
  }
  if (platform.isError || !platform.data?.user) return <Navigate to="/choose-area" />;
  const user = platform.data.user;

  if (academy.isError || !academy.data) {
    return (
      <PlatformShell
        user={user}
        onSignOut={() =>
          authClient.signOut().then(() => {
            queryClient.clear();
            return navigate({ to: "/sign-in" });
          })
        }
        breadcrumb={[
          { label: "Academias", to: "/platform/academies" },
          { label: "Não encontrada" },
        ]}
      >
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Academia não encontrada.
        </p>
      </PlatformShell>
    );
  }

  const data = academy.data;
  const responsibles = data.responsibles ?? [];
  const hasResponsibles = responsibles.length > 0;

  return (
    <PlatformShell
      user={user}
      onSignOut={() =>
        authClient.signOut().then(() => {
          queryClient.clear();
          return navigate({ to: "/sign-in" });
        })
      }
      breadcrumb={[{ label: "Academias", to: "/platform/academies" }, { label: data.name }]}
      actions={
        <>
          <Dialog open={isAddResponsibleOpen} onOpenChange={setIsAddResponsibleOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => addResponsible.reset()}>
                <PlusSignIcon className="size-4" />
                Adicionar responsável
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar responsável</DialogTitle>
                <DialogDescription>
                  Vincule uma nova conta operacional à academia sem remover os responsáveis atuais.
                </DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  addResponsible.mutate();
                }}
              >
                <Input
                  required
                  type="email"
                  placeholder="E-mail do responsável"
                  value={responsibleForm.ownerEmail}
                  onChange={(event) =>
                    setResponsibleForm((c) => ({ ...c, ownerEmail: event.target.value }))
                  }
                />
                <Input
                  placeholder="Nome do responsável (opcional)"
                  value={responsibleForm.ownerName}
                  onChange={(event) =>
                    setResponsibleForm((c) => ({ ...c, ownerName: event.target.value }))
                  }
                />
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddResponsibleOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={addResponsible.isPending}>
                    {addResponsible.isPending ? "Adicionando..." : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => support.reset()}>
                <HeadphonesIcon className="size-4" />
                Iniciar suporte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Suporte assistido</DialogTitle>
                <DialogDescription>
                  Entre como o responsável da academia por até 1 hora para prestar suporte
                  operacional visível e auditado.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <Input
                  placeholder="Motivo do suporte (opcional)"
                  value={supportReason}
                  onChange={(event) => setSupportReason(event.target.value)}
                  disabled={!hasResponsibles || support.isPending}
                />
                {!hasResponsibles ? (
                  <p className="text-muted-foreground text-sm">
                    Academia sem responsável para suporte.
                  </p>
                ) : null}
                {support.isError ? (
                  <p className="text-destructive text-sm">Não foi possível iniciar o suporte.</p>
                ) : null}
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsSupportOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => support.mutate()}
                    disabled={!hasResponsibles || support.isPending}
                  >
                    {support.isPending ? "Iniciando..." : "Iniciar como responsável"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <AcademyAvatar name={data.name} logo={data.logo} className="size-16 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold tracking-tight">{data.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>/{data.slug}</span>
                {data.address ? (
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="size-3.5" />
                    {data.address}
                  </span>
                ) : null}
                <span>Cliente desde {formatDate(data.createdAt)}</span>
              </div>
            </div>
            {!hasResponsibles ? <Badge variant="muted">Sem responsável</Badge> : null}
          </div>
          {responsibles.length > 0 ? (
            <div className="mt-4 space-y-2">
              {responsibles.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Remover responsável?"))
                        removeResponsible.mutate({
                          userId: r.id,
                          allowLeavingOwnerless: responsibles.length === 1,
                        });
                    }}
                    disabled={removeResponsible.isPending}
                  >
                    <Delete02Icon className="size-4" />
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {operational.isLoading ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando dados operacionais...
          </p>
        ) : operational.data ? (
          <OperationalOverview overview={operational.data} />
        ) : null}
      </div>
    </PlatformShell>
  );
}

function OperationalOverview({ overview }: { overview: PlatformAcademyOperationalOverview }) {
  const { summary } = overview;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailMetric
          label="Alunos ativos"
          value={summary.students.active}
          sub={`${summary.students.total} no total`}
        />
        <DetailMetric
          label="Turmas ativas"
          value={summary.classGroups.active}
          sub={`${summary.classGroups.total} no total`}
        />
        <DetailMetric
          label="Presenças válidas"
          value={summary.attendances.valid}
          sub={`${summary.attendances.total} registradas`}
        />
        <DetailMetric
          label="Mensalidades pagas"
          value={summary.monthlyFees.paid}
          sub={`${summary.monthlyFees.open} em aberto`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <PanelTable
          title="Alunos"
          head={["Nome", "Status", "Graduação"]}
          rows={overview.students.map((s) => ({
            id: s.id,
            cells: [
              <Stacked key="n" main={s.name} sub={s.email ?? "Sem e-mail"} />,
              <Badge key="s" variant={s.status === "active" ? "success" : "muted"}>
                {s.status === "active" ? "Ativo" : "Inativo"}
              </Badge>,
              `${s.belt ?? "Sem faixa"} · ${s.degree}º grau`,
            ],
          }))}
          empty="Nenhum aluno."
        />
        <PanelTable
          title="Turmas"
          head={["Nome", "Status", "Duração"]}
          rows={overview.classGroups.map((g) => ({
            id: g.id,
            cells: [
              g.name,
              <Badge key="s" variant={g.status === "active" ? "success" : "muted"}>
                {g.status === "active" ? "Ativa" : g.status}
              </Badge>,
              `${g.defaultDurationMinutes} min`,
            ],
          }))}
          empty="Nenhuma turma."
        />
        <PanelTable
          title="Mensalidades recentes"
          head={["Aluno", "Referência", "Status"]}
          rows={overview.monthlyFees.map((f) => ({
            id: f.id,
            cells: [f.studentName, f.reference, f.status],
          }))}
          empty="Nenhuma mensalidade."
        />
        <PanelTable
          title="Presenças recentes"
          head={["Aluno", "Turma", "Status"]}
          rows={overview.attendances.map((a) => ({
            id: a.id,
            cells: [a.studentName, a.classGroupName, a.status],
          }))}
          empty="Nenhuma presença."
        />
        <div className="xl:col-span-2">
          <PanelTable
            title="Promoções de graduação recentes"
            head={["Aluno", "Nova graduação", "Data"]}
            rows={overview.promotions.map((p) => ({
              id: p.id,
              cells: [p.studentName, `${p.beltName} · ${p.degree}º grau`, formatDate(p.promotedAt)],
            }))}
            empty="Nenhuma promoção."
          />
        </div>
      </div>
    </div>
  );
}

function DetailMetric({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-[1.9rem] font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-1.5 text-sm font-medium">{label}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Stacked({ main, sub }: { main: string; sub: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{main}</p>
      <p className="truncate text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

type PanelRow = { id: string; cells: ReactNode[] };

function PanelTable({
  title,
  head,
  rows,
  empty,
}: {
  title: string;
  head: string[];
  rows: PanelRow[];
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-[0.95rem] font-bold tracking-tight">{title}</h2>
      </header>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {head.map((h) => (
                <th key={h} className="px-5 py-2.5 text-xs font-semibold text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, cellIndex) => (
                  <td key={head[cellIndex] ?? cellIndex} className="px-5 py-3 align-middle">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
