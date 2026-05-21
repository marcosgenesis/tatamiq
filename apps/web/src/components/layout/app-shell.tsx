import { Link, useRouterState } from "@tanstack/react-router";
import { Menu02Icon } from "hugeicons-react";
import type { PropsWithChildren } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../ui/sheet";
import { instructorNavigation } from "./navigation";

type AppShellProps = PropsWithChildren<{
  academyName: string;
  onSignOut: () => void;
}>;

export function AppShell({ academyName, onSignOut, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-0 top-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklch,var(--border)_45%,transparent)_1px,transparent_0)] bg-[length:28px_28px] opacity-25" />
      </div>

      <DesktopSidebar academyName={academyName} onSignOut={onSignOut} />
      <MobileTopbar academyName={academyName} onSignOut={onSignOut} />

      <main className="relative pb-24 pt-5 md:pb-8 md:pl-72 md:pt-8">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-8">{children}</div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

function BrandMark({ academyName }: { academyName: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_32px_color-mix(in_oklch,var(--primary)_40%,transparent)]">
        <span className="text-lg font-black tracking-tighter">T</span>
      </div>
      <div>
        <p className="text-base font-semibold leading-none tracking-tight">Tatamiq</p>
        <p className="mt-1 text-xs text-sidebar-foreground/55">{academyName}</p>
      </div>
    </div>
  );
}

function DesktopSidebar({
  academyName,
  onSignOut,
}: {
  academyName: string;
  onSignOut: () => void;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-sidebar-border bg-sidebar/95 p-5 text-sidebar-foreground backdrop-blur-xl md:flex md:flex-col">
      <BrandMark academyName={academyName} />
      <Separator className="my-6 bg-sidebar-border" />
      <NavigationList />
      <div className="mt-auto space-y-3 rounded-2xl border border-sidebar-border bg-background/30 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-primary">V0 piloto</p>
          <p className="mt-2 text-sm text-sidebar-foreground/70">
            Operação diária para presença, graduação e mensalidades.
          </p>
        </div>
        <Button variant="secondary" className="w-full" onClick={onSignOut}>
          Sair
        </Button>
      </div>
    </aside>
  );
}

function MobileTopbar({ academyName, onSignOut }: { academyName: string; onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/88 px-4 py-3 backdrop-blur-xl md:hidden">
      <BrandMark academyName={academyName} />
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Abrir navegação">
            <Menu02Icon className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle className="sr-only">Navegação do instrutor</SheetTitle>
          <BrandMark academyName={academyName} />
          <Separator className="my-6 bg-sidebar-border" />
          <NavigationList />
          <Button variant="secondary" className="mt-6 w-full" onClick={onSignOut}>
            Sair
          </Button>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function NavigationList() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav className="flex flex-col gap-1.5" aria-label="Navegação principal">
      {instructorNavigation.map((item) => {
        const isActive = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);
        const Icon = item.icon;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/68 transition-all hover:bg-sidebar-accent/12 hover:text-sidebar-foreground",
              isActive &&
                "bg-sidebar-accent text-sidebar-accent-foreground shadow-[0_10px_32px_color-mix(in_oklch,var(--sidebar-accent)_22%,transparent)]",
            )}
          >
            <Icon className="size-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function MobileBottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const mobileItems = instructorNavigation.slice(0, 5);

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-3xl border border-border bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl md:hidden">
      {mobileItems.map((item) => {
        const isActive = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);
        const Icon = item.icon;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[0.68rem] font-medium text-muted-foreground transition-all",
              isActive && "bg-primary text-primary-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
