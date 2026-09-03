import { appDoSenseiTokens } from "@appdosensei/design-tokens";
import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenProps = PropsWithChildren<{ dark?: boolean; scroll?: boolean; footer?: ReactNode }>;

export function Screen({ children, dark = false, scroll = true, footer }: ScreenProps) {
  const backgroundColor = dark ? appDoSenseiTokens.colors.dark : appDoSenseiTokens.colors.canvas;
  const content = <View className="flex-1 gap-8 px-6 py-6">{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
      {footer}
    </SafeAreaView>
  );
}
