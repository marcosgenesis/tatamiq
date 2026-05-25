import { Link, useRouterState } from "@tanstack/react-router";
import { navGroups } from "@/components/app-shared";
import { LogoIcon } from "@/components/logo";
import { NavGroup } from "@/components/nav-group";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function AppSidebar() {
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
    </Sidebar>
  );
}

function SidebarBrand() {
  return (
    <div className="flex items-center overflow-hidden">
      <Link to="/" className="shrink-0">
        <LogoIcon className="size-9 group-data-[collapsible=icon]:size-6" />
      </Link>
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
