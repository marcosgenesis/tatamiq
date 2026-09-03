import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function ScreenHeader({
  title,
  subtitle,
  right,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  dark?: boolean;
}) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <View className="flex-1">
        <Text
          className={`text-[34px] font-bold leading-[40px] ${dark ? "text-white" : "text-ink"}`}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className={`mt-1 text-[17px] ${dark ? "text-white/60" : "text-muted-ink"}`}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
