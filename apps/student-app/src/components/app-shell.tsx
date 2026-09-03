import { appDoSenseiTokens } from "@appdosensei/design-tokens";
import type { PropsWithChildren } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AppShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
}>;

export function AppShell({ eyebrow, title, children }: AppShellProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: appDoSenseiTokens.colors.canvas }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase tracking-[2px] text-brand">
            {eyebrow}
          </Text>
          <Text
            className="text-4xl font-bold leading-tight"
            style={{ color: appDoSenseiTokens.colors.ink }}
          >
            {title}
          </Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
