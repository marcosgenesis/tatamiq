import type { StudentGraduationResponse } from "@tatamiq/contracts";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { ProgressRing } from "@/components/progress-ring";

export function GraduationSummaryCard({
  graduation,
  onPress,
}: {
  graduation: StudentGraduationResponse;
  onPress: () => void;
}) {
  const progress =
    graduation.currentBelt.maxDegrees > 0
      ? (graduation.currentDegree / graduation.currentBelt.maxDegrees) * 100
      : 0;

  return (
    <Card className="h-[110px] flex-row items-center gap-4 px-4 py-3.5">
      <ProgressRing
        progress={progress}
        size={74}
        strokeWidth={7}
        label={`${graduation.currentDegree}º`}
      />
      <View className="flex-1">
        <Text className="text-lg font-bold text-ink">{graduation.currentBelt.name}</Text>
        <Text className="mt-0.5 text-sm text-muted-ink">
          {graduation.currentDegree}º grau · máximo {graduation.currentBelt.maxDegrees}º
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={onPress}
          className="mt-1.5 flex-row items-center self-start"
        >
          <Text className="text-sm font-semibold text-brand-strong">Ver graduação</Text>
          <Icon name="chevron-right" size={17} color="#D23A0A" />
        </Pressable>
      </View>
    </Card>
  );
}
