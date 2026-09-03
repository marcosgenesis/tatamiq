import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, type IconName } from "./icon";

type ListRowProps = {
  icon: IconName;
  title: string;
  className?: string;
  subtitle?: string;
  value?: ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  iconColor?: string;
  iconBackgroundClassName?: string;
};
export function ListRow({
  icon,
  title,
  className = "",
  subtitle,
  value,
  showChevron = true,
  onPress,
  iconColor = "#8B857E",
  iconBackgroundClassName = "bg-canvas",
}: ListRowProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      className={`min-h-20 flex-row items-center gap-4 px-1 py-3 ${className}`}
    >
      <View
        className={`h-12 w-12 items-center justify-center rounded-[14px] ${iconBackgroundClassName}`}
      >
        <Icon name={icon} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink">{title}</Text>
        {subtitle ? <Text className="mt-1 text-sm text-muted-ink">{subtitle}</Text> : null}
      </View>
      {value}
      {showChevron ? <Icon name="chevron-right" color="#B8B3AD" size={22} /> : null}
    </Pressable>
  );
}
