import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { Building02Icon, PlusSignIcon, UserMultiple02Icon } from "hugeicons-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { DataGrid, DataGridContainer } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
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
import { authClient } from "../../lib/auth-client";
import {
  type PlatformAcademySummary,
  type ProvisionPlatformAcademyInput,
  platformAcademiesQuery,
  platformDashboardQuery,
  platformKeys,
  platformMeQuery,
  provisionPlatformAcademy,
} from "./platform-queries";
import { PlatformLoading, PlatformShell } from "./platform-shell";

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
  const platform = useQuery(platformMeQuery());
  const dashboard = useQuery(platformDashboardQuery());
  const academies = useQuery(
    platformAcademiesQuery(academyQuery, academyPagination.pageIndex, academyPagination.pageSize),
  );
  const provision = useMutation({
    mutationFn: (input: ProvisionPlatformAcademyInput) => provisionPlatformAcademy(input),
    onSuccess: async () => {
      setProvisionForm({ academyName: "", ownerEmail: "", ownerName: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: platformKeys.dashboard }),
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
