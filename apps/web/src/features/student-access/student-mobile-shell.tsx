import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, Home, QrCode, User, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useIsMobile } from "../../hooks/use-mobile";
import { cn } from "../../lib/utils";
import { IndicatorDot } from "../student-portal/student-indicators";

export type StudentMobileTab = "home" | "schedule" | "fees" | "profile";

type StudentMobileShellProps = {
  student: { name: string; status: string; readOnly?: boolean | null };
  activeTab: StudentMobileTab;
  indicators?: { hasCancelledClass?: boolean; hasNewFees?: boolean } | null | undefined;
  hasUpcomingClass?: boolean | undefined;
  onTabChange: (tab: StudentMobileTab) => void;
  desktop: ReactNode;
  children: ReactNode;
};

const navItems: Array<{
  key: StudentMobileTab;
  label: string;
  Icon: typeof Home;
  indicator: "schedule" | "fees" | null;
}> = [
  { key: "home", label: "Início", Icon: Home, indicator: null },
  { key: "schedule", label: "Agenda", Icon: CalendarDays, indicator: "schedule" },
  { key: "fees", label: "Mensalidades", Icon: WalletCards, indicator: "fees" },
  { key: "profile", label: "Perfil", Icon: User, indicator: null },
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
    <main className="min-h-screen bg-background text-foreground">
      <StudentTopBar student={student} />
      <div className={cn("px-4 pb-24 pt-[4.5rem]", student.readOnly && "pt-28")}>{children}</div>
      <StudentFAB hasUpcomingClass={hasUpcomingClass} />
      <StudentBottomNav activeTab={activeTab} indicators={indicators} onTabChange={onTabChange} />
    </main>
  );
}

function StudentTopBar({ student }: { student: StudentMobileShellProps["student"] }) {
  const initials = getInitials(student.name);
  const isActive = student.status === "active";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {student.readOnly ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-100">
          Acesso somente leitura: cadastro inativo.
        </div>
      ) : null}
      <div className="flex h-14 items-center gap-3 px-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{student.name}</p>
          <p className="text-xs text-muted-foreground">Área do aluno</p>
        </div>
        <Badge variant={isActive ? "default" : "muted"}>{isActive ? "Ativo" : "Inativo"}</Badge>
      </div>
    </header>
  );
}

function StudentBottomNav({
  activeTab,
  indicators,
  onTabChange,
}: {
  activeTab: StudentMobileTab;
  indicators?: StudentMobileShellProps["indicators"];
  onTabChange: (tab: StudentMobileTab) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 h-16 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="grid h-full grid-cols-4">
        {navItems.map(({ key, label, Icon, indicator }) => {
          const active = activeTab === key;
          const visible =
            indicator === "fees"
              ? indicators?.hasNewFees
              : indicator === "schedule"
                ? indicators?.hasCancelledClass
                : false;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden="true" />
                <IndicatorDot visible={Boolean(visible)} />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function StudentFAB({ hasUpcomingClass }: { hasUpcomingClass?: boolean | undefined }) {
  const navigate = useNavigate();
  return (
    <Button
      type="button"
      aria-label="Abrir QR check-in"
      onClick={() => navigate({ to: "/student/check-in" })}
      className={cn(
        "fixed bottom-20 right-4 z-40 size-14 rounded-full p-0 shadow-2xl md:hidden",
        hasUpcomingClass && "animate-pulse",
      )}
    >
      <QrCode className="size-6" aria-hidden="true" />
    </Button>
  );
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "A"
  );
}
