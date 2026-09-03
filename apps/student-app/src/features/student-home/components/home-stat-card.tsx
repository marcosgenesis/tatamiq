import { Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";

export function HomeStatCard({
  icon,
  value,
  label,
  color,
  backgroundClassName,
}: {
  icon: IconName;
  value: string;
  label: string;
  color: string;
  backgroundClassName: string;
}) {
  return (
    <View className="flex-1 flex-row items-center gap-3">
      <View
        className={`h-10 w-10 items-center justify-center rounded-[13px] ${backgroundClassName}`}
      >
        <Icon name={icon} size={21} color={color} strokeWidth={2.25} />
      </View>
      <View>
        <Text style={{ color }} className="text-lg font-bold leading-6">
          {value}
        </Text>
        <Text className="text-sm text-muted-ink">{label}</Text>
      </View>
    </View>
  );
}
