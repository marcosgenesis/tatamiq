import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building02Icon,
  DashboardSquare02Icon,
  Door01Icon,
  Logout01Icon,
  ManagerIcon,
  SecurityCheckIcon,
  UnfoldMoreIcon,
  UserMultipleIcon,
} from "hugeicons-react";
import type { ComponentType, ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LogoIcon } from "../../components/logo";
import { getInitials } from "./platform-components";

type NavItem = {
  title: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { title: "Visão geral", to: "/platform", icon: DashboardSquare02Icon, exact: true },
  { title: "Academias", to: "/platform/academies", icon: Building02Icon },
  { title: "Usuários", to: "/platform/users", icon: UserMultipleIcon },
  { title: "Administradores", to: "/platform/administrators", icon: ManagerIcon },
  { title: "Auditoria", to: "/platform/audit", icon: SecurityCheckIcon },
];

export type PlatformShellUser = {
  name: string | null;
  email: string | null;
  image?: string | null;
};

export type PlatformBreadcrumb = { label: string; to?: string };

function OperatorBrand() {
  return (
    <Link to="/platform" className="flex items-center gap-2.5 overflow-hidden px-1 py-1.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-background">
        <LogoIcon className="size-5" />
      </span>
      <span className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
        <span className="text-[0.95rem] font-bold tracking-tight">tatamiq</span>
        <span className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-primary">
          Operador
        </span>
      </span>
    </Link>
  );
}

function OperatorNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.to;
    return pathname.startsWith(item.to);
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Operação</SidebarGroupLabel>
      <SidebarMenu>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                className="text-muted-foreground"
                isActive={isActive(item)}
                tooltip={item.title}
                render={<Link to={item.to} />}
              >
                <Icon className="size-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function OperatorUser({ user, onSignOut }: { user: PlatformShellUser; onSignOut: () => void }) {
  const navigate = useNavigate();
  const name = user.name ?? "Operador";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          />
        }
      >
        <Avatar className="size-8 rounded-lg">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback className="rounded-lg bg-foreground text-background text-xs font-semibold">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
          <span className="truncate text-sm font-semibold">{name}</span>
          <span className="truncate text-xs text-muted-foreground">Operador da plataforma</span>
        </div>
        <UnfoldMoreIcon className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-60">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="size-10 rounded-lg">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback className="rounded-lg bg-foreground text-background text-sm font-semibold">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email ?? "—"}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => navigate({ to: "/choose-area" })}
          >
            <Door01Icon />
            Trocar área
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" variant="destructive" onClick={onSignOut}>
          <Logout01Icon />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PlatformShell({
  user,
  onSignOut,
  title,
  description,
  breadcrumb,
  actions,
  children,
}: {
  user: PlatformShellUser;
  onSignOut: () => void;
  title?: string;
  description?: string;
  breadcrumb?: PlatformBreadcrumb[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarProvider className="[--app-wrapper-max-width:88rem]">
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="h-14 justify-center border-b px-2">
          <OperatorBrand />
        </SidebarHeader>
        <SidebarContent>
          <OperatorNav />
        </SidebarContent>
        <SidebarFooter className="border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <OperatorUser user={user} onSignOut={onSignOut} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm supports-backdrop-filter:bg-background/60 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="min-w-0 flex-1">
            {breadcrumb ? (
              <nav className="flex items-center gap-1.5 text-sm">
                {breadcrumb.map((crumb, index) => {
                  const last = index === breadcrumb.length - 1;
                  return (
                    <span key={crumb.label} className="flex items-center gap-1.5">
                      {index > 0 ? <span className="text-muted-foreground/50">/</span> : null}
                      {crumb.to && !last ? (
                        <Link
                          to={crumb.to}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          className={
                            last ? "font-semibold text-foreground" : "text-muted-foreground"
                          }
                        >
                          {crumb.label}
                        </span>
                      )}
                    </span>
                  );
                })}
              </nav>
            ) : title ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">{title}</p>
                {description ? (
                  <p className="truncate text-xs text-muted-foreground">{description}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
        <div className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
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
