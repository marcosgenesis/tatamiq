import { Text, View } from "react-native";

export function Stat({
  value,
  label,
  className = "",
}: {
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <View className={`flex-1 ${className}`}>
      <Text className="text-[28px] font-bold text-ink">{value}</Text>
      <Text className="mt-0.5 text-sm text-muted-ink">{label}</Text>
    </View>
  );
}
