import { tatamiqTokens } from "@tatamiq/design-tokens";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export function ProgressRing({
  progress,
  size = 88,
  strokeWidth = 8,
  label,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const normalized = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tatamiqTokens.colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tatamiqTokens.colors.brand}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - normalized / 100)}
          strokeLinecap="butt"
        />
      </Svg>
      <Text className="text-xl font-bold text-ink">{label ?? `${normalized}%`}</Text>
    </View>
  );
}
