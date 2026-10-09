import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/card";
import { ListRow } from "@/components/list-row";

import type { HomeActivity } from "../home-data";

export function RecentActivityCard({ activities }: { activities: HomeActivity[] }) {
  return (
    <>
      <View className="mt-2 flex-row items-center justify-between px-1">
        <Text className="text-lg font-bold text-ink">Atividade recente</Text>
        <Pressable accessibilityRole="button">
          <Text className="text-sm font-semibold text-muted-ink">Ver tudo</Text>
        </Pressable>
      </View>

      <Card className="overflow-hidden px-3 py-0">
        {activities.length === 0 ? (
          <View className="items-center px-3 py-6">
            <Text className="text-sm font-semibold text-muted-ink">Nenhuma atividade recente.</Text>
          </View>
        ) : (
          activities.map((activity, index) => (
            <View key={activity.id}>
              <ListRow
                icon={activity.icon}
                title={activity.title}
                subtitle={activity.subtitle}
                iconColor={activity.iconColor}
                iconBackgroundClassName={activity.iconBackgroundClassName}
                className="min-h-[64px] py-2"
              />
              {index < activities.length - 1 ? <View className="ml-14 h-px bg-border" /> : null}
            </View>
          ))
        )}
      </Card>
    </>
  );
}
