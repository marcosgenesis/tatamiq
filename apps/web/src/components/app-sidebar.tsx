import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft01Icon } from "hugeicons-react";
import { AcademyAvatar } from "@/components/academy-switcher";
import { footerNavLinks, navGroups } from "@/components/app-shared";
import { useAppShell } from "@/components/app-shell";
import { LogoIcon } from "@/components/logo";
import { NavGroup } from "@/components/nav-group";
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
        <SidebarBrand />
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

function SidebarBrand() {
  const { activeAcademy } = useAppShell();

  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <Link to="/" className="shrink-0 group-data-[collapsible=icon]:hidden">
        <LogoIcon className="size-5" />
      </Link>
      <div className="h-5 w-px shrink-0 bg-foreground/40 group-data-[collapsible=icon]:hidden" />
      <div className="flex min-w-0 items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:p-0">
        <AcademyAvatar name={activeAcademy.name} className="size-6 shrink-0 text-[10px]" />
        <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
          {activeAcademy.name}
        </span>
      </div>
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
