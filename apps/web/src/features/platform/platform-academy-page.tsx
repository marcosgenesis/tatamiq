import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { HeadphonesIcon, MapPinIcon, RepeatIcon } from "hugeicons-react";
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
  impersonateWithPendingPlatformSupportActivation,
  type PlatformAcademyOperationalOverview,
  platformAcademyOperationalOverviewQuery,
  platformAcademyQuery,
  platformKeys,
  platformMeQuery,
  startPlatformSupport,
  transferPlatformAcademy,
} from "./platform-queries";
import { PlatformLoading, PlatformShell } from "./platform-shell";

export function PlatformAcademyPage({ academyId }: { academyId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [transferForm, setTransferForm] = useState({ ownerEmail: "", ownerName: "" });
  const [supportReason, setSupportReason] = useState("");
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const platform = useQuery(platformMeQuery());
  const academy = useQuery(platformAcademyQuery(academyId));
  const operational = useQuery(platformAcademyOperationalOverviewQuery(academyId));

  const support = useMutation({
    mutationFn: async () => {
      if (!academy.data?.owner) throw new Error("Academia sem dono.");
      const prepared = await startPlatformSupport({
        targetUserId: academy.data.owner.id,
        academyId,
        ...(supportReason ? { reason: supportReason } : {}),
      });
      await impersonateWithPendingPlatformSupportActivation({
        supportSessionId: prepared.id,
        userId: academy.data.owner.id,
        impersonateUser: authClient.admin.impersonateUser,
      });
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/choose-area";
    },
  });

  const transfer = useMutation({
    mutationFn: async () =>
      transferPlatformAcademy({
        academyId,
        ownerEmail: transferForm.ownerEmail,
        ...(transferForm.ownerName ? { ownerName: transferForm.ownerName } : {}),
      }),
    onSuccess: async () => {
      setTransferForm({ ownerEmail: "", ownerName: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: platformKeys.academy(academyId) }),
        queryClient.invalidateQueries({ queryKey: platformKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: ["platform", "academies"] }),
      ]);
    },
  });

  if (platform.isLoading || academy.isLoading) {
    return <PlatformLoading label="Carregando academia..." />;
  }
  if (platform.isError || !platform.data?.user) return <Navigate to="/choose-area" />;
  const user = platform.data.user;

  if (academy.isError || !academy.data) {
    return (
      <PlatformShell
        user={user}
        onSignOut={() => authClient.signOut().then(() => navigate({ to: "/sign-in" }))}
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
  const hasOwner = Boolean(data.owner);

  return (
    <PlatformShell
      user={user}
      onSignOut={() => authClient.signOut().then(() => navigate({ to: "/sign-in" }))}
      breadcrumb={[{ label: "Academias", to: "/platform/academies" }, { label: data.name }]}
      actions={
        <>
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
                  Entre como o dono por até 1 hora para prestar suporte operacional visível e
                  auditado.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <Input
                  placeholder="Motivo do suporte (opcional)"
                  value={supportReason}
                  onChange={(event) => setSupportReason(event.target.value)}
                  disabled={!hasOwner || support.isPending}
                />
                {!hasOwner ? (
                  <p className="text-muted-foreground text-sm">Academia sem dono para suporte.</p>
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
                    disabled={!hasOwner || support.isPending}
                  >
                    {support.isPending ? "Iniciando..." : "Iniciar como dono"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => transfer.reset()}>
                <RepeatIcon className="size-4" />
                Transferir
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transferência de academia</DialogTitle>
                <DialogDescription>
                  Troque o dono operacional sem acessar senha ou caixa de e-mail do cliente.
                </DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  transfer.mutate();
                }}
              >
                <Input
                  required
                  type="email"
                  placeholder="Novo e-mail do dono"
                  value={transferForm.ownerEmail}
                  onChange={(event) =>
                    setTransferForm((c) => ({ ...c, ownerEmail: event.target.value }))
                  }
                />
                <Input
                  placeholder="Nome do novo dono (opcional)"
                  value={transferForm.ownerName}
                  onChange={(event) =>
                    setTransferForm((c) => ({ ...c, ownerName: event.target.value }))
                  }
                />
                {transfer.data?.firstAccessLink ? (
                  <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                    <p className="font-medium">Link de primeiro acesso</p>
                    <p className="mt-1 break-all text-muted-foreground">
                      {transfer.data.firstAccessLink}
                    </p>
                  </div>
                ) : null}
                {transfer.data && !transfer.data.firstAccessLink ? (
                  <p className="text-muted-foreground text-sm">
                    Academia transferida para conta existente.
                  </p>
                ) : null}
                {transfer.isError ? (
                  <p className="text-destructive text-sm">
                    Não foi possível transferir a academia.
                  </p>
                ) : null}
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsTransferOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={transfer.isPending}>
                    {transfer.isPending ? "Transferindo..." : "Transferir academia"}
                  </Button>
                </DialogFooter>
              </form>
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
            {!hasOwner ? <Badge variant="muted">Sem dono</Badge> : null}
          </div>
          {data.owner ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dono
                </p>
                <p className="mt-0.5 truncate text-sm font-medium">
                  {data.owner.name}{" "}
                  <span className="font-normal text-muted-foreground">· {data.owner.email}</span>
                </p>
              </div>
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
