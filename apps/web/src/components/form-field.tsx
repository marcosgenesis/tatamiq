import type { InputHTMLAttributes } from "react";

export function Field(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
    label: string;
    onChange: (value: string) => void;
  },
) {
  const { label, onChange, ...inputProps } = props;
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{label}</span>
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
}) {
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{props.label}</span>
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
