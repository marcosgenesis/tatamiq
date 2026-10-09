import type { ComponentProps } from "react";
import { Pressable, Text } from "react-native";
import type { TintVariant } from "./badge";

const variants: Record<TintVariant, string> = {
  brand: "bg-brand text-white",
  success: "bg-success-soft text-success",
  warning: "bg-[#FFF1DD] text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "border border-border bg-surface text-ink",
};
type PillProps = Omit<ComponentProps<typeof Pressable>, "children"> & {
  label: string;
  variant?: TintVariant;
};
export function Pill({ label, variant = "neutral", className = "", ...props }: PillProps) {
  const [first, ...rest] = variants[variant].split(" ");
  const text = rest.pop();
  return (
    <Pressable
      className={`h-14 items-center justify-center rounded-full ${first} ${rest.join(" ")} ${className}`}
      {...props}
    >
      <Text className={`text-base font-bold ${text}`}>{label}</Text>
    </Pressable>
  );
}
