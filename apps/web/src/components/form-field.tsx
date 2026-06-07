import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
    label: string;
    onChange: (value: string) => void;
  },
) {
  const { label, onChange, className, ...inputProps } = props;
  return (
    <label className={cn("space-y-2 text-sm font-medium", className)}>
      <span>
        {label}
        {inputProps.required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      <input
        {...inputProps}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

export function SelectField(props: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("space-y-2 text-sm font-medium", props.className)}>
      <span>
        {props.label}
        {props.required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
