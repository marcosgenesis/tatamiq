import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Building02Icon, UserMultiple02Icon } from "hugeicons-react";
import { type ReactNode, useState } from "react";
import { LogoIcon } from "../../components/logo";
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
  getPlatformAcademy,
  getPlatformAcademyOperationalOverview,
  getPlatformDashboard,
  getPlatformMe,
  listPlatformAcademies,
  type PlatformAcademyOperationalOverview,
  type PlatformAcademySummary,
} from "./platform-api";

export function PlatformPage() {
  const navigate = useNavigate();
  const [academyQuery, setAcademyQuery] = useState("");
  const platform = useQuery({
    queryKey: ["platform", "me"],
    queryFn: getPlatformMe,
    retry: false,
  });
  const dashboard = useQuery({
    queryKey: ["platform", "dashboard"],
    queryFn: getPlatformDashboard,
    retry: false,
  });
  const academies = useQuery({
    queryKey: ["platform", "academies", academyQuery],
    queryFn: () => listPlatformAcademies(academyQuery),
    retry: false,
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
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Academias" value={dashboard.data?.totals.academies} />
        <MetricCard label="Usuários" value={dashboard.data?.totals.users} />
        <MetricCard label="Administradores" value={dashboard.data?.totals.admins} />
        <MetricCard label="Usuários bloqueados" value={dashboard.data?.totals.bannedUsers} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
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
                onChange={(event) => setAcademyQuery(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <AcademiesTable academies={academies.data?.items ?? []} loading={academies.isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(dashboard.data?.recentAcademies ?? []).map((academy) => (
              <AcademyListItem key={academy.id} academy={academy} />
            ))}
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
  const platform = useQuery({ queryKey: ["platform", "me"], queryFn: getPlatformMe, retry: false });
  const academy = useQuery({
    queryKey: ["platform", "academies", academyId],
    queryFn: () => getPlatformAcademy(academyId),
    retry: false,
  });
  const operational = useQuery({
    queryKey: ["platform", "academies", academyId, "operational-overview"],
    queryFn: () => getPlatformAcademyOperationalOverview(academyId),
    retry: false,
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
      <div className="flex items-center justify-between">
        <div>
          <Link to="/platform" className="text-muted-foreground text-sm hover:text-foreground">
            ← Voltar para Administração da Plataforma
          </Link>
          <h2 className="mt-2 font-semibold text-2xl">{academy.data.name}</h2>
          <p className="text-muted-foreground text-sm">/{academy.data.slug}</p>
        </div>
        <Badge variant="muted">Somente leitura</Badge>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados básicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Dono" value={academy.data.owner?.name ?? "Sem dono"} />
            <DetailRow label="Email do dono" value={academy.data.owner?.email ?? "—"} />
            <DetailRow label="Endereço" value={academy.data.address ?? "—"} />
            <DetailRow label="Telefone/WhatsApp" value={academy.data.phone ?? "—"} />
            <DetailRow label="Instagram" value={academy.data.instagram ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regra de edição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Esta visão é completa o suficiente para diagnóstico, mas é somente leitura. Editar
              alunos, turmas, mensalidades, presenças, Pix ou graduação não é permitido diretamente
              em /platform.
            </p>
            <p>Quando a edição for necessária, ela deve acontecer via Suporte Assistido.</p>
          </CardContent>
        </Card>
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

function PlatformShell({
  user,
  onSignOut,
  children,
}: {
  user: { name: string | null; email: string | null };
  onSignOut: () => void;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <LogoIcon className="size-8" />
            <div>
              <p className="text-muted-foreground text-sm">Tatamiq</p>
              <h1 className="font-semibold text-xl">Administração da Plataforma</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium">{user.name ?? "Administrador"}</p>
              <p className="text-muted-foreground">{user.email ?? "Sem email"}</p>
            </div>
            <Link
              to="/choose-area"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Trocar área
            </Link>
            <Button variant="ghost" onClick={onSignOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto space-y-6 px-6 py-8 max-w-6xl">{children}</div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          {label === "Academias" ? (
            <Building02Icon className="size-5" />
          ) : (
            <UserMultiple02Icon className="size-5" />
          )}
        </div>
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="font-semibold text-2xl tabular-nums">{value ?? "—"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AcademiesTable({
  academies,
  loading,
}: {
  academies: PlatformAcademySummary[];
  loading: boolean;
}) {
  if (loading) return <p className="text-muted-foreground text-sm">Carregando academias...</p>;
  if (academies.length === 0)
    return <p className="text-muted-foreground text-sm">Nenhuma academia encontrada.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Academia</TableHead>
          <TableHead>Dono</TableHead>
          <TableHead>Criada em</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {academies.map((academy) => (
          <TableRow key={academy.id}>
            <TableCell>
              <Link
                to="/platform/academies/$academyId"
                params={{ academyId: academy.id }}
                className="font-medium hover:underline"
              >
                {academy.name}
              </Link>
              <p className="text-muted-foreground text-xs">/{academy.slug}</p>
            </TableCell>
            <TableCell>
              {academy.owner ? (
                <div>
                  <p>{academy.owner.name}</p>
                  <p className="text-muted-foreground text-xs">{academy.owner.email}</p>
                </div>
              ) : (
                <Badge variant="muted">Sem dono</Badge>
              )}
            </TableCell>
            <TableCell>{formatDate(academy.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function PlatformLoading({ label }: { label: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <LogoIcon className="size-12" />
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}
