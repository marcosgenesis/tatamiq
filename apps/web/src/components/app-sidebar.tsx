import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft01Icon, Tick01Icon, UnfoldMoreIcon } from "hugeicons-react";
import { footerNavLinks, navGroups } from "@/components/app-shared";
import { useAppShell } from "@/components/app-shell";
import { LogoIcon } from "@/components/logo";
import { NavGroup } from "@/components/nav-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { onSignOut } = useAppShell();

  return (
    <Sidebar
      className={cn(
        "*:data-[slot=sidebar-inner]:bg-background",
        "*:data-[slot=sidebar-inner]:dark:bg-[radial-gradient(60%_18%_at_10%_0%,--theme(--color-foreground/.08),transparent)]",
        "**:data-[slot=sidebar-menu-button]:[&>span]:text-foreground/75",
      )}
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarHeader className="h-14 justify-center border-b px-3">
        <AcademySwitcher />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavGroup key={group.label} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-0 p-0">
        <SidebarMenu className="border-t p-2">
          {footerNavLinks.map((item) => (
            <SidebarMenuItem key={item.title}>
              <NavLink item={item} size="sm" />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <SidebarMenu className="border-t p-2">
          <SidebarMenuItem>
            <SidebarMenuButton className="text-muted-foreground" size="sm" onClick={onSignOut}>
              <ArrowLeft01Icon className="size-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AcademySwitcher() {
  const { activeAcademy, academies, onSwitchAcademy } = useAppShell();

  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <Link to="/" className="shrink-0 group-data-[collapsible=icon]:hidden">
        <LogoIcon className="size-5" />
      </Link>
      <div className="h-5 w-px shrink-0 bg-foreground/40 group-data-[collapsible=icon]:hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:p-0">
          <AcademyAvatar name={activeAcademy.name} className="size-6 shrink-0 text-[10px]" />
          <span className="truncate group-data-[collapsible=icon]:hidden">
            {activeAcademy.name}
          </span>
          <UnfoldMoreIcon className="size-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Academias</DropdownMenuLabel>
          </DropdownMenuGroup>
          <div className="-mx-1 my-1 h-px bg-border" />
          <DropdownMenuGroup>
            {academies.map((academy) => (
              <DropdownMenuItem
                key={academy.id}
                className="flex items-center justify-between gap-2"
                onClick={() => onSwitchAcademy(academy.id)}
              >
                <div className="flex items-center gap-3">
                  <AcademyAvatar name={academy.name} className="size-8 text-xs" />
                  <span className="truncate">{academy.name}</span>
                </div>
                {academy.id === activeAcademy.id && (
                  <Tick01Icon className="size-4 shrink-0 text-foreground" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function NavLink({
  item,
  size,
}: {
  item: { title: string; path: string; icon: React.ComponentType<{ className?: string }> };
  size?: "sm" | "default";
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);
  const Icon = item.icon;

  return (
    <SidebarMenuButton
      className="text-muted-foreground"
      isActive={isActive}
      size={size}
      render={<Link to={item.path} />}
    >
      <Icon className="size-4" />
      <span>{item.title}</span>
    </SidebarMenuButton>
  );
}

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-500",
  "bg-sky-500",
];

function AcademyAvatar({ name, className }: { name: string; className?: string }) {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  const color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold text-white",
        color,
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
