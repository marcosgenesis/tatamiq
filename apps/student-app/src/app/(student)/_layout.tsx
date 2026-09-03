import { Tabs, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const tabItems: Record<string, { label: string; icon: IconName }> = {
  home: { label: "Início", icon: "home" },
  agenda: { label: "Agenda", icon: "calendar" },
  cobrancas: { label: "Cobranças", icon: "wallet" },
  perfil: { label: "Perfil", icon: "user" },
};

function StudentTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index];

  if (activeRoute.name === "check-in" || activeRoute.name === "graduacao") return null;

  const renderTab = (routeName: string) => {
    const routeIndex = state.routes.findIndex((route) => route.name === routeName);
    const route = state.routes[routeIndex];
    const item = tabItems[routeName];
    const focused = state.index === routeIndex;
    const color = focused ? "#F4531C" : "#8B857E";

    return (
      <Pressable
        key={routeName}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={item.label}
        onPress={() => navigation.navigate(route.name, route.params)}
        className="flex-1 items-center justify-center gap-1 pt-3"
      >
        <Icon name={item.icon} size={27} color={color} strokeWidth={2.25} />
        <Text style={{ color }} className="text-xs font-semibold">
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      className="relative flex-row border-t border-border bg-surface"
      style={{ height: 70 + insets.bottom, paddingBottom: insets.bottom }}
    >
      {renderTab("home")}
      {renderTab("agenda")}
      <View className="flex-1" />
      {renderTab("cobrancas")}
      {renderTab("perfil")}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fazer check-in"
        onPress={() => router.push("/check-in")}
        className="absolute left-1/2 top-0 h-[76px] w-[76px] -translate-x-1/2 -translate-y-8 items-center justify-center rounded-full bg-brand-soft"
      >
        <View
          className="h-[68px] w-[68px] items-center justify-center rounded-full bg-brand"
          style={{
            shadowColor: "#F4531C",
            shadowOpacity: 0.25,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <Icon name="qr-code" size={32} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </Pressable>
    </View>
  );
}

export default function StudentLayout() {
  return (
    <Tabs
      initialRouteName="home"
      tabBar={(props) => <StudentTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="cobrancas" />
      <Tabs.Screen name="perfil" />
      <Tabs.Screen name="check-in" options={{ href: null }} />
      <Tabs.Screen name="graduacao" options={{ href: null }} />
    </Tabs>
  );
}
