import type { StudentNextClassResponse } from "@tatamiq/contracts";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { Icon } from "@/components/icon";

import { formatClassBadge, formatClassDetails } from "../home-data";

export function NextClassCard({
  nextClass,
  onCheckIn,
}: {
  nextClass: StudentNextClassResponse["nextClass"];
  onCheckIn: () => void;
}) {
  const router = useRouter();
  const hasClass = Boolean(nextClass);

  return (
    <View
      className="rounded-[24px]"
      style={{
        shadowColor: "#D23A0A",
        shadowOpacity: 0.16,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 8 },
        elevation: 5,
      }}
    >
      <View className="overflow-hidden rounded-[24px] px-5 py-5">
        <Svg width="100%" height="100%" style={{ position: "absolute" }}>
          <Defs>
            <LinearGradient id="student-home-hero" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor="#C93500" />
              <Stop offset="0.58" stopColor="#F4531C" />
              <Stop offset="1" stopColor="#FF672D" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#student-home-hero)" />
          <Circle cx="105%" cy="20%" r="36%" fill="#FF7C4C" opacity={0.34} />
          <Circle cx="108%" cy="104%" r="31%" fill="#FF8050" opacity={0.35} />
        </Svg>

        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-bold tracking-[1.5px] text-white/85">PRÓXIMA AULA</Text>
          {nextClass ? (
            <View className="rounded-full bg-white/20 px-3 py-1.5">
              <Text className="text-sm font-semibold text-white">
                {formatClassBadge(nextClass.scheduledStartAt)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-2 text-[25px] font-bold leading-[31px] text-white">
          {nextClass?.classGroupName ?? "Nenhuma aula próxima"}
        </Text>
        <Text className="mt-1 text-[15px] text-white/90">
          {nextClass
            ? formatClassDetails(nextClass.scheduledStartAt, nextClass.durationMinutes)
            : "Confira sua agenda para os próximos dias"}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={hasClass ? onCheckIn : () => router.push("/agenda")}
          className="mt-5 h-[50px] flex-row items-center justify-center gap-2 rounded-full bg-white"
        >
          <Icon
            name={hasClass ? "qr-code" : "calendar"}
            size={20}
            color="#C93500"
            strokeWidth={2.5}
          />
          <Text className="text-base font-bold text-brand-strong">
            {hasClass ? "Fazer check-in" : "Ver agenda"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
