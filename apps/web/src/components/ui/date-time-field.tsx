"use client";

import { CalendarDateTime, parseDateTime } from "@internationalized/date";
import { Calendar01Icon, Clock01Icon } from "hugeicons-react";
import { useId, useMemo } from "react";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker,
  DateSegment,
  type DateValue,
  Dialog,
  FieldError,
  Group,
  Heading,
  Label,
  Popover,
} from "react-aria-components";
import { cn } from "../../lib/utils";

type DateTimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
};

function parseLocalDateTime(value: string): CalendarDateTime | null {
  if (!value) return null;
  try {
    return parseDateTime(value.length === 16 ? `${value}:00` : value);
  } catch {
    return null;
  }
}

function formatLocalDateTime(value: DateValue | null): string {
  if (!value || !("hour" in value)) return "";
  return `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(
    value.day,
  ).padStart(
    2,
    "0",
  )}T${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;
}

export function DateTimeField({ value, onChange, label, id, disabled }: DateTimeFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const parsedValue = useMemo(() => parseLocalDateTime(value), [value]);

  return (
    <DatePicker
      id={fieldId}
      value={parsedValue}
      onChange={(nextValue) => onChange(formatLocalDateTime(nextValue))}
      granularity="minute"
      hourCycle={24}
      {...(disabled !== undefined ? { isDisabled: disabled } : {})}
      placeholderValue={new CalendarDateTime(2026, 1, 1, 19, 0)}
      validationBehavior="aria"
      className="block space-y-2 text-sm font-medium"
    >
      {label ? <Label className="text-muted-foreground">{label}</Label> : null}
      <Group
        className={cn(
          "flex h-11 w-full items-center rounded-xl border border-border bg-background text-foreground outline-none transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        )}
      >
        <Calendar01Icon className="ml-3 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <DateInput className="flex min-w-0 flex-1 items-center px-2 text-sm">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="rounded px-0.5 tabular-nums outline-none data-focused:bg-primary data-focused:text-primary-foreground data-placeholder:text-muted-foreground"
            />
          )}
        </DateInput>
        <Button
          type="button"
          className="mr-1 inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          <Clock01Icon className="size-4" aria-hidden />
        </Button>
      </Group>
      <FieldError className="text-sm text-destructive" />
      <Popover
        placement="bottom start"
        className="z-50 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:fade-out-0 data-exiting:zoom-out-95"
      >
        <Dialog className="outline-none">
          <Calendar className="w-72">
            <header className="mb-3 flex items-center justify-between gap-2">
              <Button
                slot="previous"
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-xl text-sm outline-none transition hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                ‹
              </Button>
              <Heading className="text-sm font-medium" />
              <Button
                slot="next"
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-xl text-sm outline-none transition hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                ›
              </Button>
            </header>
            <CalendarGrid className="w-full border-separate border-spacing-1">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="h-8 text-xs font-medium text-muted-foreground">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    className="size-9 cursor-default rounded-xl text-center text-sm outline-none transition data-disabled:text-muted-foreground/40 data-focused:ring-2 data-focused:ring-primary/20 data-hovered:bg-accent data-hovered:text-accent-foreground data-outside-month:text-muted-foreground/50 data-selected:bg-primary data-selected:text-primary-foreground"
                  />
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </DatePicker>
  );
}
