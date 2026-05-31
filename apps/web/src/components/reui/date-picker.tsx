import { Calendar01Icon } from "hugeicons-react";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function DatePicker({ value, onChange, placeholder = "Selecionar data", disabled }: DatePickerProps) {
  return (
    <div className="relative">
      <Calendar01Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="date"
        value={value}
        disabled={disabled}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-11 w-full rounded-2xl border border-border bg-background px-3 pl-9 text-left text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
        )}
      />
    </div>
  );
}
