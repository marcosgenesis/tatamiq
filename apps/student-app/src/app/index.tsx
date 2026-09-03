import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { authClient } from "@/lib/auth-client";

export default function IndexScreen() {
  const session = authClient.useSession();

  if (session.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#F4531C" />
      </View>
    );
  }

  return <Redirect href={session.data ? "/home" : "/login"} />;
}
