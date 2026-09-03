import { Text, View } from "react-native";

import { ScreenHeader } from "@/components/screen-header";

import { getFirstName, getInitial } from "../home-data";

export function HomeHeader({
  academyName,
  studentName,
}: {
  academyName: string;
  studentName: string;
}) {
  return (
    <View className="mx-1 mb-0.5">
      <Text className="mb-0.5 text-[15px] font-medium text-muted-ink">{academyName}</Text>
      <ScreenHeader
        title={getFirstName(studentName)}
        right={
          <View className="h-11 w-11 items-center justify-center rounded-full bg-brand">
            <Text className="text-xl font-semibold text-white">{getInitial(studentName)}</Text>
          </View>
        }
      />
    </View>
  );
}
