import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react";
import { type DayPickerProps, DayPicker } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function DatePicker({ value, onChange, placeholder = "Selecionar data", disabled }: DatePickerProps) {
  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

  function handleSelect(date: Date | undefined) {
    onChange(date ? format(date, "yyyy-MM-dd") : "");
  }

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-2xl border border-border bg-background px-3 text-left text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
        )}
        render={<button type="button" />}
      >
        <Calendar01Icon className="size-4 shrink-0 text-muted-foreground" />
        {selected ? format(selected, "dd/MM/yyyy") : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          {...(selected ? { defaultMonth: selected } : {})}
        />
      </PopoverContent>
    </Popover>
  );
}

function Calendar(props: DayPickerProps) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays
      classNames={{
        root: "p-0",
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex items-center justify-center relative",
        caption_label: "text-sm font-medium capitalize",
        nav: "flex items-center gap-1 absolute inset-x-0 justify-between",
        button_previous: "size-7 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-colors",
        button_next: "size-7 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-colors",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-[0.8rem] font-normal text-muted-foreground text-center",
        week: "flex mt-1",
        day: "p-0 text-center",
        day_button:
          "size-8 inline-flex items-center justify-center rounded-lg text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary/90",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/30",
        today: "font-bold text-primary",
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ArrowLeft01Icon className="size-4" />
          ) : (
            <ArrowRight01Icon className="size-4" />
          ),
      }}
      {...props}
    />
  );
}
