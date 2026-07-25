import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Calendar03Icon,
  CheckmarkSquare03Icon,
  GraduationScrollIcon,
  Home01Icon,
  Menu02Icon,
  Money03Icon,
  QrCodeIcon,
  UserCircleIcon,
  UserMultiple02Icon,
  UserMultipleIcon,
} from "hugeicons-react";
import type { ComponentType } from "react";
import { useState } from "react";
import { api } from "@/api";
import { useAppShell } from "@/components/app-shell";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { academyQueryKey } from "@/lib/academy-query-keys";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

type Tab = { label: string; to: string; icon: IconType; match: (path: string) => boolean };

/** Link tabs, split around the center Chamada FAB (2 before, the rest after). */
const TABS: Tab[] = [
  { label: "Início", to: "/", icon: Home01Icon, match: (p) => p === "/" },
  {
    label: "Alunos",
    to: "/students",
    icon: UserMultipleIcon,
    match: (p) => p.startsWith("/students"),
  },
  {
    label: "Agenda",
    to: "/schedule",
    icon: Calendar03Icon,
    match: (p) => p.startsWith("/schedule"),
  },
];
const TABS_BEFORE_FAB = 2;

const MORE_ROUTES = ["/class-groups", "/monthly-fees", "/graduation", "/attendances", "/settings"];

const MORE_ITEMS: { label: string; to: string; icon: IconType; description: string }[] = [
  {
    label: "Turmas",
    to: "/class-groups",
    icon: UserMultiple02Icon,
    description: "Grupos, horários e alunos",
  },
  {
    label: "Mensalidades",
    to: "/monthly-fees",
    icon: Money03Icon,
    description: "Cobranças e pagamentos",
  },
  {
    label: "Frequência",
    to: "/attendances",
    icon: CheckmarkSquare03Icon,
    description: "Presenças por turma",
  },
  {
    label: "Graduação",
    to: "/graduation",
    icon: GraduationScrollIcon,
    description: "Promoções de faixa e grau",
  },
  {
    label: "Configurações",
    to: "/settings",
    icon: UserCircleIcon,
    description: "Academia, Pix e conta",
  },
];

function TabButton({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      to={tab.to}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-1"
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-m-ink-3")}
        strokeWidth={active ? 2 : 1.6}
      />
      <span
        className={cn(
          "text-[12px] leading-none",
          active ? "font-medium text-primary" : "text-m-ink-3",
        )}
      >
        {tab.label}
      </span>
    </Link>
  );
}

export function MobileBottomNav() {
  const navigate = useNavigate();
  const { activeAcademy } = useAppShell();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  const activeClassQuery = useQuery({
    queryKey: academyQueryKey(activeAcademy.id, "classes", "active"),
    queryFn: async () => {
      const { data } = await api.GET("/classes/active");
      return data ?? null;
    },
  });

  const moreActive = MORE_ROUTES.some((r) => pathname.startsWith(r));

  function openChamada() {
    const active = activeClassQuery.data;
    if (active?.id) {
      void navigate({ to: "/classes/$classId", params: { classId: active.id } });
    } else {
      void navigate({ to: "/schedule" });
    }
  }

  return (
    <>
      <nav className="sticky bottom-0 z-30 border-border border-t bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md items-center px-2 pt-2.5">
          {TABS.slice(0, TABS_BEFORE_FAB).map((tab) => (
            <TabButton key={tab.to} tab={tab} active={tab.match(pathname)} />
          ))}

          <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={openChamada}
              aria-label="Chamada"
              className="grid size-[54px] place-items-center rounded-full bg-primary shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-transform active:scale-95"
            >
              <QrCodeIcon className="size-5 text-primary-foreground" strokeWidth={2} />
            </button>
            <span className="text-[12px] font-medium leading-none text-primary-strong">
              Chamada
            </span>
          </div>

          {TABS.slice(TABS_BEFORE_FAB).map((tab) => (
            <TabButton key={tab.to} tab={tab} active={tab.match(pathname)} />
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-current={moreActive ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-1"
          >
            <Menu02Icon
              className={cn("size-3.5 shrink-0", moreActive ? "text-primary" : "text-m-ink-3")}
              strokeWidth={moreActive ? 2 : 1.6}
            />
            <span
              className={cn(
                "text-[12px] leading-none",
                moreActive ? "font-medium text-primary" : "text-m-ink-3",
              )}
            >
              Mais
            </span>
          </button>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="font-mobile tracking-[-0.15px]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-[15px] font-medium text-m-ink">Mais</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-1 px-4 pb-8">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-m-surface">
                    <Icon className="size-5 text-m-ink-2" strokeWidth={1.6} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[14px] text-m-ink">{item.label}</span>
                    <span className="text-[12px] text-m-ink-3">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
