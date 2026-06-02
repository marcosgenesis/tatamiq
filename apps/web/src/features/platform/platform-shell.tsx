import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { Building02Icon, ManagerIcon, SecurityCheckIcon, UserListIcon } from "hugeicons-react";
import type { ReactNode } from "react";
import { LogoIcon } from "../../components/logo";
import { Tabs, TabsList, TabsTrigger } from "../../components/reui/tabs";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { platformDashboardQuery } from "./platform-queries";

const PLATFORM_TABS = [
  { to: "/platform", label: "Academias", icon: Building02Icon, count: "academies" },
  { to: "/platform/users", label: "Usuários", icon: UserListIcon, count: "users" },
  { to: "/platform/administrators", label: "Administradores", icon: ManagerIcon, count: "admins" },
  { to: "/platform/audit", label: "Auditoria", icon: SecurityCheckIcon, count: null },
] as const;

type TabCount = "academies" | "users" | "admins" | null;

function activeTab(pathname: string): (typeof PLATFORM_TABS)[number]["to"] {
  if (pathname.startsWith("/platform/users")) return "/platform/users";
  if (pathname.startsWith("/platform/administrators")) return "/platform/administrators";
  if (pathname.startsWith("/platform/audit")) return "/platform/audit";
  return "/platform";
}

function PlatformTabs() {
  const location = useLocation();
  const dashboard = useQuery(platformDashboardQuery());
  const totals = dashboard.data?.totals;

  return (
    <Tabs value={activeTab(location.pathname)}>
      <TabsList>
        {PLATFORM_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tab.count ? totals?.[tab.count as Exclude<TabCount, null>] : undefined;
          return (
            <TabsTrigger
              key={tab.to}
              value={tab.to}
              className="flex gap-1.5"
              render={<Link to={tab.to} />}
            >
              <Icon size={16} />
              {tab.label}
              {count !== undefined ? <Badge>{count}</Badge> : null}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

export function PlatformShell({
  user,
  onSignOut,
  actions,
  children,
}: {
  user: { name: string | null; email: string | null };
  onSignOut: () => void;
  actions?: ReactNode;
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

      <div className="mx-auto space-y-6 px-6 py-8 max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PlatformTabs />
          {actions}
        </div>
        {children}
      </div>
    </main>
  );
}

export function PlatformLoading({ label }: { label: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <LogoIcon className="size-12" />
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
    </main>
  );
}
