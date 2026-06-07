import { useNavigate } from "@tanstack/react-router";
import {
  Calendar03Icon,
  Home01Icon,
  QrCodeIcon,
  UserCircleIcon,
  Wallet01Icon,
} from "hugeicons-react";
import type { ComponentType, ReactNode } from "react";
import { useIsMobile } from "../../hooks/use-mobile";
import { cn } from "../../lib/utils";
import { IndicatorDot } from "../student-portal/student-indicators";

export type StudentMobileTab = "home" | "schedule" | "fees" | "profile";

type Indicators = { hasCancelledClass?: boolean; hasNewFees?: boolean } | null | undefined;

type StudentMobileShellProps = {
  student: { name: string; status: string; readOnly?: boolean | null };
  /** Active bottom-nav tab, or null on secondary screens (graduação, presenças). */
  activeTab: StudentMobileTab | null;
  indicators?: Indicators;
  hasUpcomingClass?: boolean | undefined;
  onTabChange: (tab: StudentMobileTab) => void;
  desktop: ReactNode;
  children: ReactNode;
};

type NavItem = {
  key: StudentMobileTab;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  indicator?: "schedule" | "fees";
};

const LEFT: NavItem[] = [
  { key: "home", label: "Início", Icon: Home01Icon },
  { key: "schedule", label: "Agenda", Icon: Calendar03Icon, indicator: "schedule" },
];
const RIGHT: NavItem[] = [
  { key: "fees", label: "Mensalidades", Icon: Wallet01Icon, indicator: "fees" },
  { key: "profile", label: "Perfil", Icon: UserCircleIcon },
];

export function StudentMobileShell({
  student,
  activeTab,
  indicators,
  hasUpcomingClass,
  onTabChange,
  desktop,
  children,
}: StudentMobileShellProps) {
  const isMobile = useIsMobile();
  if (!isMobile) return <>{desktop}</>;

  return (
    <main className="relative mx-auto min-h-screen max-w-screen-sm bg-background text-foreground">
      {student.readOnly ? (
        <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          Acesso somente leitura: cadastro inativo.
        </div>
      ) : null}
      <div className="pb-28">{children}</div>
      <BottomNav
        activeTab={activeTab}
        indicators={indicators}
        hasUpcomingClass={hasUpcomingClass}
        onTabChange={onTabChange}
      />
    </main>
  );
}

function BottomNav({
  activeTab,
  indicators,
  hasUpcomingClass,
  onTabChange,
}: {
  activeTab: StudentMobileTab | null;
  indicators: Indicators;
  hasUpcomingClass?: boolean | undefined;
  onTabChange: (tab: StudentMobileTab) => void;
}) {
  const navigate = useNavigate();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-screen-sm md:hidden">
      <div className="relative flex h-[4.75rem] items-stretch border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {LEFT.map((item) => (
          <NavTab
            key={item.key}
            item={item}
            active={activeTab === item.key}
            indicators={indicators}
            onSelect={() => onTabChange(item.key)}
          />
        ))}
        <div className="w-16 shrink-0" aria-hidden="true" />
        {RIGHT.map((item) => (
          <NavTab
            key={item.key}
            item={item}
            active={activeTab === item.key}
            indicators={indicators}
            onSelect={() => onTabChange(item.key)}
          />
        ))}
      </div>
      <button
        type="button"
        aria-label="Fazer check-in com QR Code"
        onClick={() => navigate({ to: "/student/check-in" })}
        className={cn(
          "absolute -top-5 left-1/2 grid size-[4.25rem] -translate-x-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95 motion-reduce:transition-none",
          hasUpcomingClass && "motion-safe:animate-pulse",
        )}
      >
        <QrCodeIcon className="size-7" aria-hidden="true" />
      </button>
    </nav>
  );
}

function NavTab({
  item,
  active,
  indicators,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  indicators: Indicators;
  onSelect: () => void;
}) {
  const visible =
    item.indicator === "fees"
      ? indicators?.hasNewFees
      : item.indicator === "schedule"
        ? indicators?.hasCancelledClass
        : false;
  const { Icon } = item;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-1 pt-1.5 text-[11px] font-semibold transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="relative">
        <Icon className="size-[1.35rem]" aria-hidden="true" />
        <IndicatorDot visible={Boolean(visible)} />
      </span>
      {item.label}
    </button>
  );
}

export function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "A"
  );
}
