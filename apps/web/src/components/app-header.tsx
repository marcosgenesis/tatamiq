import { useRouterState } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { navLinks } from "@/components/app-shared";
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeItem = navLinks.find((item) =>
    item.path === "/" ? pathname === "/" : pathname.startsWith(item.path),
  );

  const breadcrumbPage = activeItem
    ? { title: activeItem.title, icon: <activeItem.icon className="size-3.5" /> }
    : null;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6",
        "bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50",
      )}
    >
      <div className="flex items-center gap-3">
        <CustomSidebarTrigger />
        <Separator
          className="mr-2 h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <AppBreadcrumbs page={breadcrumbPage} />
      </div>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
