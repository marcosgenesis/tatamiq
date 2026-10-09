import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { type AgendaClass, AgendaClassSheet } from "@/components/agenda-class-sheet";
import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";

const days = [
  { weekday: "qua", day: "27" },
  { weekday: "qui", day: "28" },
  { weekday: "sex", day: "29" },
  { weekday: "sáb", day: "30" },
  { weekday: "dom", day: "31" },
  { weekday: "seg", day: "1" },
  { weekday: "ter", day: "2" },
];

type AgendaGroup = { label: string; date: string; classes: AgendaClass[] };

const groups: AgendaGroup[] = [
  {
    label: "Hoje",
    date: "qua, 27 de ago.",
    classes: [
      { id: "fundamentos", time: "07:00", title: "Fundamentos · Manhã" },
      { id: "no-gi-hoje", time: "19:00", title: "No-Gi · Noite" },
    ],
  },
  {
    label: "Amanhã",
    date: "qui, 28 de ago.",
    classes: [
      { id: "gi", time: "07:00", title: "Gi · Manhã" },
      { id: "competicao", time: "20:00", title: "Competição", cancelled: true },
    ],
  },
  {
    label: "Sexta",
    date: "sex, 29 de ago.",
    classes: [{ id: "no-gi-sexta", time: "19:00", title: "No-Gi · Noite" }],
  },
];

function ClassCard({ item, onPress }: { item: AgendaClass; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.time}`}
      disabled={item.cancelled}
      onPress={onPress}
    >
      <Card
        className={`min-h-[104px] flex-row items-center px-[14px] py-4 ${item.cancelled ? "bg-[#EFEEEC] shadow-none" : ""}`}
      >
        <View className="w-[64px]">
          <Text
            className={`text-[22px] font-bold ${item.cancelled ? "text-muted-ink" : "text-ink"}`}
          >
            {item.time}
          </Text>
          <Text className="mt-0.5 text-[15px] text-muted-ink">60 min</Text>
        </View>
        <View className="mx-[14px] h-[50px] w-px bg-border" />
        <Text
          className={`flex-1 text-[19px] font-bold ${item.cancelled ? "text-muted-ink" : "text-ink"}`}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        {item.cancelled ? (
          <View className="ml-2">
            <Badge variant="danger">Cancelada</Badge>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

export default function AgendaScreen() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedClass, setSelectedClass] = useState<AgendaClass | null>(null);
  const snapPoints = useMemo(() => ["64%"], []);

  return (
    <>
      <Screen>
        <View className="gap-5">
          <ScreenHeader title="Agenda" subtitle="Próximos 7 dias" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {days.map((day, index) => {
              const selected = selectedDay === index;
              return (
                <Pressable
                  key={`${day.weekday}-${day.day}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${day.weekday}, dia ${day.day}`}
                  onPress={() => setSelectedDay(index)}
                  className={`h-14 w-[46px] items-center justify-center rounded-[15px] border ${selected ? "border-brand bg-brand" : "border-border bg-surface"}`}
                >
                  <Text
                    className={`text-xs font-semibold ${selected ? "text-white" : "text-muted-ink"}`}
                  >
                    {day.weekday}
                  </Text>
                  <Text
                    className={`mt-1 text-[20px] font-bold ${selected ? "text-white" : "text-ink"}`}
                  >
                    {day.day}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View className="gap-6">
            {groups.map((group) => (
              <View key={group.label} className="gap-3">
                <View className="flex-row items-baseline gap-1.5 px-1">
                  <Text className="text-[18px] font-bold text-ink">{group.label}</Text>
                  <Text className="text-base text-muted-ink">· {group.date}</Text>
                </View>
                <View className="gap-3">
                  {group.classes.map((item) => (
                    <ClassCard key={item.id} item={item} onPress={() => setSelectedClass(item)} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </Screen>
      <AgendaClassSheet
        agendaClass={selectedClass}
        snapPoints={snapPoints}
        onClose={() => setSelectedClass(null)}
      />
    </>
  );
}
