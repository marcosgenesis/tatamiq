import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "../../api";
import { LogoIcon } from "../../components/logo";
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
import {
  type PlatformAcademyOperationalOverview,
  platformAcademyOperationalOverviewQuery,
  platformAcademyQuery,
  platformKeys,
  platformMeQuery,
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
        queryClient.invalidateQueries({ queryKey: platformKeys.academy(academyId) }),
        queryClient.invalidateQueries({ queryKey: platformKeys.dashboard }),
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}
