"use client";
import {
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowUp01Icon,
  ArrowUp02Icon,
  MinusSignIcon,
  TradeDownIcon,
  TradeUpIcon,
} from "hugeicons-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type DeltaIconVariant = "default" | "trend" | "arrow";
type DeltaVariant = "default" | "badge";

type DeltaContextValue = {
  value: number;
};

const DeltaContext = React.createContext<DeltaContextValue | null>(null);

function useDeltaValue() {
  const context = React.useContext(DeltaContext);

  if (!context) {
    throw new Error("DeltaIcon and DeltaValue must be used inside a `Delta` component.");
  }

  return context.value;
}

function Delta({
  className,
  value,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  value: number;
  variant?: DeltaVariant;
}) {
  return (
    <DeltaContext.Provider value={{ value }}>
      {variant === "badge" ? (
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight",
            "gap-1 border-none tabular-nums [&_svg]:size-4 [&_svg]:shrink-0",
            value > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500",
            className,
          )}
          data-slot="delta"
          {...props}
        />
      ) : (
        <div
          className={cn(
            "inline-flex items-center gap-1 text-muted-foreground tabular-nums",
            "[&_svg]:size-3 [&_svg]:shrink-0",
            value > 0 ? "text-emerald-600 dark:text-emerald-400" : "",
            value < 0 ? "text-rose-600 dark:text-rose-400" : "",
            className,
          )}
          data-slot="delta"
          {...props}
        />
      )}
    </DeltaContext.Provider>
  );
}

function FilledShell({ value, children }: { value: number; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex size-3 shrink-0 items-center justify-center rounded-full",
        "[&_svg]:size-2! [&_svg]:shrink-0 [&_svg]:stroke-3! [&_svg]:text-background",
        value > 0 && "bg-emerald-500",
        value < 0 && "bg-red-500",
        (!value || value === 0) && "bg-muted-foreground",
      )}
      data-slot="delta-icon"
    >
      {children}
    </span>
  );
}

function DeltaIcon({
  variant = "default",
  filled = false,
  className,
}: {
  variant?: DeltaIconVariant;
  filled?: boolean;
  className?: string;
}) {
  const resolvedValue = useDeltaValue();

  const mergedClassName = cn(className);

  const shell = (node: React.ReactElement) =>
    filled ? <FilledShell value={resolvedValue}>{node}</FilledShell> : node;

  if (!resolvedValue || resolvedValue === 0) {
    return shell(<MinusSignIcon data-slot="delta-icon" className={mergedClassName} />);
  }

  if (resolvedValue > 0) {
    if (variant === "trend") {
      return shell(<TradeUpIcon data-slot="delta-icon" className={mergedClassName} />);
    }

    if (variant === "arrow") {
      return shell(<ArrowUp02Icon data-slot="delta-icon" className={mergedClassName} />);
    }

    return shell(<ArrowUp01Icon data-slot="delta-icon" className={mergedClassName} />);
  }

  if (variant === "trend") {
    return shell(<TradeDownIcon data-slot="delta-icon" className={mergedClassName} />);
  }

  if (variant === "arrow") {
    return shell(<ArrowDown02Icon data-slot="delta-icon" className={mergedClassName} />);
  }

  return shell(<ArrowDown01Icon data-slot="delta-icon" className={mergedClassName} />);
}

function DeltaValue({
  className,
  precision = 1,
  suffix = "%",
  absolute = true,
  ...props
}: React.ComponentProps<"span"> & {
  precision?: number;
  suffix?: string;
  absolute?: boolean;
}) {
  const resolvedValue = useDeltaValue();

  const formattedValue = (absolute ? Math.abs(resolvedValue) : resolvedValue).toFixed(precision);

  return (
    <span className={cn("tabular-nums", className)} data-slot="delta-value" {...props}>
      {formattedValue}
      {suffix}
    </span>
  );
}

export { Delta, DeltaIcon, DeltaValue };
