import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import type { components } from "@tatamiq/contracts/generated";
import { Building02Icon, PlusSignIcon, UserMultiple02Icon } from "hugeicons-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { DataGrid, DataGridContainer } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { api } from "../../api";
import { LogoIcon } from "../../components/logo";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
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

type PlatformAcademySummary = components["schemas"]["PlatformAcademySummaryDto"];
type PlatformAcademyOperationalOverview =
  components["schemas"]["PlatformAcademyOperationalOverviewDto"];

export function PlatformPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [academyQuery, setAcademyQuery] = useState("");
  const [academyPagination, setAcademyPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    academyName: "",
    ownerEmail: "",
    ownerName: "",
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
  const dashboard = useQuery({
    queryKey: ["platform", "dashboard"],
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/dashboard");
      if (error) throw error;
      return data;
    },
    retry: false,
  });
  const academies = useQuery({
    queryKey: [
      "platform",
      "academies",
      academyQuery,
      academyPagination.pageIndex,
      academyPagination.pageSize,
    ],
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/academies", {
        params: {
          query: {
            ...(academyQuery.trim() ? { q: academyQuery.trim() } : {}),
            page: academyPagination.pageIndex,
            pageSize: academyPagination.pageSize,
          },
        },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });
  const provision = useMutation({
    mutationFn: async (input: { academyName: string; ownerEmail: string; ownerName?: string }) => {
      const { data, error } = await api.POST("/platform/academies/provision", {
        body: input,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      setProvisionForm({ academyName: "", ownerEmail: "", ownerName: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["platform", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["platform", "academies"] }),
      ]);
    },
  });

  if (platform.isLoading) {
    return <PlatformLoading label="Carregando Administração da Plataforma..." />;
  }

  if (platform.isError) {
    return <Navigate to="/choose-area" />;
  }

  const user = platform.data?.user;

  if (!user) {
    return <Navigate to="/choose-area" />;
  }

  return (
    <PlatformShell
      user={user}
      onSignOut={() => authClient.signOut().then(() => navigate({ to: "/sign-in" }))}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav
          aria-label="Seções da plataforma"
          className="inline-flex w-fit rounded-xl border border-border bg-background/80 p-1 shadow-sm"
        >
          <Link
            to="/platform"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-primary-foreground text-sm font-medium shadow-sm"
          >
            Academias
          </Link>
          <Link
            to="/platform/users"
            className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-muted-foreground text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
          >
            Usuários
          </Link>
          <Link
            to="/platform/administrators"
            className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-muted-foreground text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
          >
            Administradores
          </Link>
          <Link
            to="/platform/audit"
            className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-muted-foreground text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
          >
            Auditoria
          </Link>
        </nav>

        <Dialog open={isProvisionOpen} onOpenChange={setIsProvisionOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => provision.reset()}>
              <PlusSignIcon className="size-4" />
              Provisionar academia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Provisionar Academia</DialogTitle>
              <DialogDescription>
                Crie uma Academia para um email existente ou para uma Conta Reservada com link
                copiável.
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                provision.mutate({
                  academyName: provisionForm.academyName,
                  ownerEmail: provisionForm.ownerEmail,
                  ...(provisionForm.ownerName ? { ownerName: provisionForm.ownerName } : {}),
                });
              }}
            >
              <Input
                required
                placeholder="Nome da academia"
                value={provisionForm.academyName}
                onChange={(event) =>
                  setProvisionForm((current) => ({ ...current, academyName: event.target.value }))
                }
              />
              <Input
                required
                type="email"
                placeholder="Email do dono"
                value={provisionForm.ownerEmail}
                onChange={(event) =>
                  setProvisionForm((current) => ({ ...current, ownerEmail: event.target.value }))
                }
              />
              <Input
                placeholder="Nome do dono"
                value={provisionForm.ownerName}
                onChange={(event) =>
                  setProvisionForm((current) => ({ ...current, ownerName: event.target.value }))
                }
              />
              {provision.data?.firstAccessLink ? (
                <div className="rounded-lg border bg-background p-3 text-sm">
                  <p className="font-medium">Link de primeiro acesso</p>
                  <p className="break-all text-muted-foreground">
                    {provision.data.firstAccessLink}
                  </p>
                </div>
              ) : null}
              {provision.data && !provision.data.firstAccessLink ? (
                <p className="text-muted-foreground text-sm">
                  Academia provisionada para uma conta existente.
                </p>
              ) : null}
              {provision.isError ? (
                <p className="text-destructive text-sm">Não foi possível provisionar a academia.</p>
              ) : null}
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsProvisionOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={provision.isPending}>
                  {provision.isPending ? "Criando..." : "Provisionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Academias" value={dashboard.data?.totals.academies} to="/platform" />
        <MetricCard label="Usuários" value={dashboard.data?.totals.users} to="/platform/users" />
        <MetricCard
          label="Administradores"
          value={dashboard.data?.totals.admins}
          to="/platform/administrators"
        />
        <MetricCard
          label="Usuários bloqueados"
          value={dashboard.data?.totals.bannedUsers}
          to="/platform/users"
        />
      </section>

      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Academias</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Busque por nome, slug ou email do dono.
                </p>
              </div>
              <Input
                className="sm:max-w-xs"
                placeholder="Buscar academia..."
                value={academyQuery}
                onChange={(event) => {
                  setAcademyQuery(event.target.value);
                  setAcademyPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
              />
            </div>
          </CardHeader>
          <CardContent>
            <AcademiesDataGrid
              academies={academies.data?.items ?? []}
              loading={academies.isLoading}
              pagination={academyPagination}
              onPaginationChange={setAcademyPagination}
              rowCount={academies.data?.pagination.total ?? 0}
              pageCount={academies.data?.pagination.totalPages ?? -1}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {((dashboard.data?.recentAcademies ?? []) as PlatformAcademySummary[]).map(
              (academy) => (
                <AcademyListItem key={academy.id} academy={academy} />
              ),
            )}
            {dashboard.isLoading ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : null}
            {!dashboard.isLoading && (dashboard.data?.recentAcademies.length ?? 0) === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma academia encontrada.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </PlatformShell>
  );
}

export function PlatformAcademyPage({ academyId }: { academyId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [transferForm, setTransferForm] = useState({ ownerEmail: "", ownerName: "" });
  const [supportReason, setSupportReason] = useState("");
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const platform = useQuery({
    queryKey: ["platform", "me"],
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/me");
      if (error) throw error;
      return data;
    },
    retry: false,
  });
  const academy = useQuery({
    queryKey: ["platform", "academies", academyId],
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/academies/{id}", {
        params: { path: { id: academyId } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });
  const operational = useQuery({
    queryKey: ["platform", "academies", academyId, "operational-overview"],
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/academies/{id}/operational-overview", {
        params: { path: { id: academyId } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });
  const support = useMutation({
    mutationFn: async () => {
      if (!academy.data?.owner) throw new Error("Academia sem dono.");
      const { data: prepared, error: prepareError } = await api.POST("/platform/support/start", {
        body: {
          targetUserId: academy.data.owner.id,
          academyId,
          ...(supportReason ? { reason: supportReason } : {}),
        },
      });
      if (prepareError) throw prepareError;
      const impersonation = await authClient.admin.impersonateUser({
        userId: academy.data.owner.id,
      });
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

  const transfer = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/platform/academies/{id}/transfer", {
        params: { path: { id: academyId } },
        body: {
          ownerEmail: transferForm.ownerEmail,
          ...(transferForm.ownerName ? { ownerName: transferForm.ownerName } : {}),
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      setTransferForm({ ownerEmail: "", ownerName: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["platform", "academies", academyId] }),
        queryClient.invalidateQueries({ queryKey: ["platform", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["platform", "academies"] }),
      ]);
    },
  });

  if (platform.isLoading || academy.isLoading) {
    return <PlatformLoading label="Carregando academia..." />;
  }

  if (platform.isError) {
    return <Navigate to="/choose-area" />;
  }

  const user = platform.data?.user;
  if (!user) return <Navigate to="/choose-area" />;

  if (academy.isError || !academy.data) {
    return (
      <PlatformShell
        user={user}
        onSignOut={() => authClient.signOut().then(() => navigate({ to: "/sign-in" }))}
      >
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Academia não encontrada.</p>
          </CardContent>
        </Card>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell
      user={user}
      onSignOut={() => authClient.signOut().then(() => navigate({ to: "/sign-in" }))}
    >
      <section className="overflow-hidden rounded-[calc(var(--radius)+0.55rem)]">
        <div
          className="h-60 rounded-[calc(var(--radius)+0.55rem)]"
          style={{
            background:
              "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.45), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 42%), linear-gradient(135deg, #93c5fd 0%, #c4b5fd 48%, #f9a8d4 100%)",
          }}
        />
        <div className="px-5 pb-8 pt-0">
          <div className="-mt-[4.55rem] flex flex-col items-center text-center">
            <div className="relative rounded-full bg-background p-1.5 shadow-[0_22px_70px_rgba(0,0,0,0.35)] ring-1 ring-white/80 dark:ring-border">
              <div className="grid size-36 place-items-center overflow-hidden rounded-full bg-muted">
                {academy.data.logo ? (
                  <img
                    src={academy.data.logo}
                    alt={academy.data.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <LogoIcon className="size-20 text-primary" />
                )}
              </div>
              <span className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
                <span aria-hidden="true" className="text-base leading-none">
                  ✓
                </span>
                <span className="sr-only">Academia verificada</span>
              </span>
            </div>
            <h2 className="mt-6 font-semibold text-2xl">{academy.data.name}</h2>
            <p className="text-muted-foreground text-sm">
              {academy.data.owner?.email ?? `/${academy.data.slug}`}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                to="/platform"
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Voltar
              </Link>
              <Button type="button" variant="secondary" disabled>
                Somente leitura
              </Button>
              <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => support.reset()}>
                    Suporte assistido
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Suporte Assistido</DialogTitle>
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
                      disabled={!academy.data.owner || support.isPending}
                    />
                    {!academy.data.owner ? (
                      <p className="text-muted-foreground text-sm">
                        Academia sem dono para suporte.
                      </p>
                    ) : null}
                    {support.isError ? (
                      <p className="text-destructive text-sm">
                        Não foi possível iniciar o suporte.
                      </p>
                    ) : null}
                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsSupportOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => support.mutate()}
                        disabled={!academy.data.owner || support.isPending}
                      >
                        {support.isPending ? "Iniciando..." : "Iniciar suporte como dono"}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => transfer.reset()}>Transferir academia</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transferência de Academia</DialogTitle>
                    <DialogDescription>
                      Troque o dono operacional sem acessar senha ou caixa de email do cliente.
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
                      placeholder="Novo email do dono"
                      value={transferForm.ownerEmail}
                      onChange={(event) =>
                        setTransferForm((current) => ({
                          ...current,
                          ownerEmail: event.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Nome do novo dono"
                      value={transferForm.ownerName}
                      onChange={(event) =>
                        setTransferForm((current) => ({
                          ...current,
                          ownerName: event.target.value,
                        }))
                      }
                    />
                    {transfer.data?.firstAccessLink ? (
                      <div className="rounded-lg border bg-background p-3 text-sm">
                        <p className="font-medium">Link de primeiro acesso</p>
                        <p className="break-all text-muted-foreground">
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
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsTransferOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={transfer.isPending}>
                        {transfer.isPending ? "Transferindo..." : "Transferir Academia"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>

      {operational.isLoading ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Carregando dados operacionais...</p>
          </CardContent>
        </Card>
      ) : null}

      {operational.data ? <OperationalOverview overview={operational.data} /> : null}
    </PlatformShell>
  );
}

function OperationalOverview({ overview }: { overview: PlatformAcademyOperationalOverview }) {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <SmallMetric label="Alunos" value={overview.summary.students.total} />
        <SmallMetric label="Turmas" value={overview.summary.classGroups.total} />
        <SmallMetric label="Mensalidades" value={overview.summary.monthlyFees.total} />
        <SmallMetric label="Presenças" value={overview.summary.attendances.total} />
        <SmallMetric label="Promoções" value={overview.summary.promotions.total} />
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Graduação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <p>{student.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {student.email ?? "Sem email"}
                      </p>
                    </TableCell>
                    <TableCell>{student.status}</TableCell>
                    <TableCell>
                      {student.belt ?? "Sem faixa"} • grau {student.degree}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Turmas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.classGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{group.status}</TableCell>
                    <TableCell>{group.defaultDurationMinutes} min</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mensalidades recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.monthlyFees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell>{fee.studentName}</TableCell>
                    <TableCell>{fee.reference}</TableCell>
                    <TableCell>{fee.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Presenças recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.attendances.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell>{attendance.studentName}</TableCell>
                    <TableCell>{attendance.classGroupName}</TableCell>
                    <TableCell>{attendance.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Promoções de Graduação recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Nova graduação</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.promotions.map((promotion) => (
                  <TableRow key={promotion.id}>
                    <TableCell>{promotion.studentName}</TableCell>
                    <TableCell>
                      {promotion.beltName} • grau {promotion.degree}
                    </TableCell>
                    <TableCell>{formatDate(promotion.promotedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </section>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-semibold text-xl tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  to,
}: {
  label: string;
  value: number | undefined;
  to: "/platform" | "/platform/users" | "/platform/administrators";
}) {
  return (
    <Link to={to} className="group block rounded-[calc(var(--radius)+0.55rem)] outline-none">
      <Card className="transition-colors group-hover:border-primary/30 group-hover:bg-muted/40 group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary/15">
            {label === "Academias" ? (
              <Building02Icon className="size-5" />
            ) : (
              <UserMultiple02Icon className="size-5" />
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-sm transition-colors group-hover:text-foreground">
              {label}
            </p>
            <p className="font-semibold text-2xl tabular-nums">{value ?? "—"}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AcademiesDataGrid({
  academies,
  loading,
  pagination,
  onPaginationChange,
  rowCount,
  pageCount,
}: {
  academies: PlatformAcademySummary[];
  loading: boolean;
  pagination: PaginationState;
  onPaginationChange: Dispatch<SetStateAction<PaginationState>>;
  rowCount: number;
  pageCount: number;
}) {
  const columns = useMemo<ColumnDef<PlatformAcademySummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Academia",
        size: 260,
        cell: ({ row }) => (
          <div>
            <Link
              to="/platform/academies/$academyId"
              params={{ academyId: row.original.id }}
              className="font-medium hover:underline"
            >
              {row.original.name}
            </Link>
            <p className="text-muted-foreground text-xs">/{row.original.slug}</p>
          </div>
        ),
      },
      {
        id: "owner",
        header: "Dono",
        size: 260,
        cell: ({ row }) =>
          row.original.owner ? (
            <div>
              <p>{row.original.owner.name}</p>
              <p className="text-muted-foreground text-xs">{row.original.owner.email}</p>
            </div>
          ) : (
            <Badge variant="muted">Sem dono</Badge>
          ),
      },
      {
        accessorKey: "createdAt",
        header: "Criada em",
        size: 140,
        cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: academies,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination },
    onPaginationChange,
  });

  return (
    <DataGridContainer>
      <DataGrid
        table={table}
        recordCount={rowCount}
        isLoading={loading}
        emptyMessage="Nenhuma academia encontrada."
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
          sizes={[10, 25, 50]}
        />
      </DataGrid>
    </DataGridContainer>
  );
}

function AcademyListItem({ academy }: { academy: PlatformAcademySummary }) {
  return (
    <Link
      to="/platform/academies/$academyId"
      params={{ academyId: academy.id }}
      className="block rounded-lg border bg-background p-3 transition-colors hover:bg-muted/50"
    >
      <p className="font-medium text-sm">{academy.name}</p>
      <p className="text-muted-foreground text-xs">{academy.owner?.email ?? "Sem dono"}</p>
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}
