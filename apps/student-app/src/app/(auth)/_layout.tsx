import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { authClient } from "@/lib/auth-client";

export default function AuthLayout() {
  const session = authClient.useSession();

  if (session.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#F4531C" />
      </View>
    );
  }

  if (session.data) return <Redirect href="/home" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
