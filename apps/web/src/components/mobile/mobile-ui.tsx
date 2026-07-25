import { AlertCircleIcon, Search01Icon } from "hugeicons-react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

/* ── Screen scaffold ── */

/** Scrolling content column for a mobile screen (the mobile shell provides the chrome). */
export function MobileScreen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-4 px-4 pt-1.5 pb-6", className)}>{children}</div>;
}

/** Page title (24/medium) with an optional count badge, subtitle, and trailing action. */
export function ScreenHeader({
  title,
  count,
  subtitle,
  action,
}: {
  title: string;
  count?: number | undefined;
  subtitle?: string | undefined;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-[24px] font-medium text-m-ink">{title}</h1>
          {count != null ? (
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[12px] font-medium text-primary-soft-foreground">
              {count}
            </span>
          ) : null}
        </div>
        {action}
      </div>
      {subtitle ? <p className="text-[13px] text-m-ink-2">{subtitle}</p> : null}
    </div>
  );
}

/** Bordered "outline" action button (e.g. "Novo", "Aula avulsa"). */
export function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon?: IconType;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2.5 text-[13px] font-medium text-m-ink"
    >
      {Icon ? <Icon className="size-3.5 text-m-ink-2" strokeWidth={1.8} /> : null}
      {label}
    </button>
  );
}

/** Solid primary pill CTA (used in empty/error states). */
export function PrimaryPill({
  icon: Icon,
  onClick,
  children,
}: {
  icon?: IconType;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground"
    >
      {Icon ? <Icon className="size-4" strokeWidth={2} /> : null}
      {children}
    </button>
  );
}

/* ── Controls ── */

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-m-surface p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "flex-1 rounded-md py-1.5 text-[13px]",
            value === tab.value
              ? "bg-card font-medium text-m-ink shadow-sm"
              : "font-normal text-m-ink-2",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  trailing,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3">
      <Search01Icon className="size-5 shrink-0 text-m-ink-3" strokeWidth={1.8} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] text-m-ink outline-none placeholder:text-m-ink-3"
      />
      {trailing}
    </div>
  );
}

/** Horizontal pill filters with an optional count per chip. */
export function FilterChips<T extends string>({
  chips,
  value,
  onChange,
}: {
  chips: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {chips.map((chip) => {
        const active = value === chip.value;
        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onChange(chip.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px]",
              active
                ? "border-primary-soft-border bg-primary-soft font-medium text-primary-soft-foreground"
                : "border-border bg-card text-m-ink-2",
            )}
          >
            {chip.label}
            {chip.count != null ? (
              <span
                className={cn(
                  "font-medium",
                  active ? "text-primary-soft-foreground" : "text-m-ink-3",
                )}
              >
                {chip.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ── Status pill ── */

export type StatusTone = "neutral" | "success" | "warning" | "info" | "error" | "primary";

const TONE: Record<StatusTone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-m-surface text-m-ink-2", dot: "bg-m-ink-3" },
  success: { pill: "bg-success/15 text-success-foreground", dot: "bg-emerald-500" },
  warning: { pill: "bg-warning/15 text-warning-foreground", dot: "bg-warning" },
  info: { pill: "bg-info/15 text-info-foreground", dot: "bg-info" },
  error: { pill: "bg-destructive/12 text-destructive", dot: "bg-destructive" },
  primary: { pill: "bg-primary-soft text-primary-soft-foreground", dot: "bg-primary" },
};

export function StatusPill({
  tone,
  dot,
  children,
  className,
}: {
  tone: StatusTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
        TONE[tone].pill,
        className,
      )}
    >
      {dot ? <span className={cn("size-1.5 rounded-full", TONE[tone].dot)} /> : null}
      {children}
    </span>
  );
}

/* ── Full-screen states ── */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
}: {
  icon: IconType;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: "neutral" | "primary";
}) {
  return (
    <div className="flex flex-col items-center gap-3.5 px-6 pt-14 pb-6 text-center">
      <span
        className={cn(
          "grid size-16 place-items-center rounded-full",
          tone === "primary" ? "bg-primary-soft" : "bg-m-surface",
        )}
      >
        <Icon
          className={cn(
            "size-7",
            tone === "primary" ? "text-primary-soft-foreground" : "text-m-ink-2",
          )}
          strokeWidth={1.6}
        />
      </span>
      <p className="text-[14px] font-medium text-m-ink">{title}</p>
      <p className="max-w-[280px] text-[13px] leading-relaxed text-m-ink-2">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Não foi possível carregar",
  description = "Verifique sua conexão e tente novamente.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3.5 px-6 pt-14 pb-6 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-warning/15">
        <AlertCircleIcon className="size-7 text-warning-foreground" strokeWidth={1.8} />
      </span>
      <p className="text-[14px] font-medium text-m-ink">{title}</p>
      <p className="max-w-[280px] text-[13px] leading-relaxed text-m-ink-2">{description}</p>
      <PrimaryPill onClick={onRetry}>Tentar novamente</PrimaryPill>
    </div>
  );
}
