import type { ComponentProps } from "react";
import { View } from "react-native";

export function Card({ className = "", style, ...props }: ComponentProps<typeof View>) {
  return (
    <View
      className={`rounded-[24px] bg-surface p-5 ${className}`}
      style={[
        {
          shadowColor: "#1C1A17",
          shadowOpacity: 0.07,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 3,
        },
        style,
      ]}
      {...props}
    />
  );
}
