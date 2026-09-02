import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";

export type TintVariant = "brand" | "success" | "warning" | "danger" | "neutral";
const styles: Record<TintVariant, string> = {
  brand: "bg-brand-soft text-brand-strong",
  success: "bg-success-soft text-success",
  warning: "bg-[#FFF1DD] text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-canvas text-muted-ink",
};

export function Badge({
  children,
  variant = "neutral",
}: PropsWithChildren<{ variant?: TintVariant }>) {
  const [background, text] = styles[variant].split(" ");
  return (
    <View className={`self-start rounded-full px-3 py-1.5 ${background}`}>
      <Text className={`text-sm font-semibold ${text}`}>{children}</Text>
    </View>
  );
}
