import type { StudentNextClassResponse } from "@appdosensei/contracts";
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
    <View className="rounded-[24px] bg-[#F4531C] p-4">
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
  );
}
