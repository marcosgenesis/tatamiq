import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "muted" | "primary" | "success";

const TONES: Record<Tone, string> = {
  muted: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

/**
 * Onboarding-grade empty state: icon tile + what-appears-here title +
 * why-it-matters description + optional CTA. Used by every student section.
 */
export function StudentEmptyState({
  icon: Icon,
  tone = "muted",
  title,
  description,
  action,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  tone?: Tone;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 px-6 py-8 text-center",
        className,
      )}
    >
      <span
        className={cn("mb-1 flex size-16 items-center justify-center rounded-2xl", TONES[tone])}
      >
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h3 className="font-heading text-base font-bold tracking-tight text-foreground">{title}</h3>
      <p className="max-w-[18rem] text-sm/relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
