"use client";

import { Time } from "@internationalized/date";
import { Clock01Icon } from "hugeicons-react";
import { useId, useMemo } from "react";
import {
  TimeField as AriaTimeField,
  DateInput,
  DateSegment,
  FieldError,
  Label,
  type TimeValue,
} from "react-aria-components";
import { cn } from "../../lib/utils";

function parseTimeValue(value: string): Time | null {
  const parts = value.split(":");
  if (parts.length !== 2) return null;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return new Time(hour, minute);
}

function formatTimeValue(value: TimeValue | null): string {
  if (!value) return "";
  return `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;
}

export function TimeField({
  value,
  onChange,
  label,
  placeholder = "HH:mm",
  id,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  step?: number;
  label?: string;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const parsedValue = useMemo(() => parseTimeValue(value), [value]);

  return (
    <AriaTimeField
      id={fieldId}
      value={parsedValue}
      onChange={(nextValue) => onChange(formatTimeValue(nextValue))}
      granularity="minute"
      hourCycle={24}
      placeholderValue={parseTimeValue(placeholder) ?? new Time(19, 0)}
      className="min-w-0 space-y-2 text-sm font-medium"
      validationBehavior="aria"
    >
      {label ? <Label className="block">{label}</Label> : null}
      <div className="relative">
        <Clock01Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <DateInput
          className={cn(
            "flex h-11 w-full items-center rounded-2xl border border-border bg-background pr-3 pl-9 text-sm font-normal text-foreground outline-none transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
            className,
          )}
        >
          {(segment) => (
            <DateSegment
              segment={segment}
              className="rounded px-0.5 tabular-nums outline-none data-focused:bg-primary data-focused:text-primary-foreground data-placeholder:text-muted-foreground"
            />
          )}
        </DateInput>
      </div>
      <FieldError className="text-sm text-destructive" />
    </AriaTimeField>
  );
}
