import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "./icon";

export type AgendaClass = {
  id: string;
  time: string;
  title: string;
  cancelled?: boolean;
};

type AgendaClassSheetProps = {
  agendaClass: AgendaClass | null;
  snapPoints: ComponentProps<typeof BottomSheet>["snapPoints"];
  onClose: () => void;
};

const details: { icon: IconName; label: string; value: string }[] = [
  { icon: "clock", label: "Duração", value: "60 min" },
  { icon: "user", label: "Professor", value: "Rafael Souza" },
  { icon: "map-pin", label: "Local", value: "Tatame 1" },
  { icon: "signal", label: "Nível", value: "Todos os níveis" },
];

function ActionButton({
  icon,
  label,
  primary = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  primary?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`h-[52px] flex-row items-center justify-center gap-3 rounded-full ${primary ? "bg-brand" : "border border-border bg-surface"}`}
    >
      <Icon name={icon} size={21} color={primary ? "#FFFFFF" : "#1C1A17"} strokeWidth={2.2} />
      <Text className={`text-[17px] font-bold ${primary ? "text-white" : "text-ink"}`}>
        {label}
      </Text>
      {!primary ? <Text className="-ml-2 -mt-3 text-lg font-bold text-ink">+</Text> : null}
    </Pressable>
  );
}

export function AgendaClassSheet({ agendaClass, snapPoints, onClose }: AgendaClassSheetProps) {
  const router = useRouter();
  if (!agendaClass) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderRadius: 28, backgroundColor: "#FFFFFF" }}
        handleIndicatorStyle={{ backgroundColor: "#D4D1CD", width: 40, height: 5 }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={0.62}
          />
        )}
      >
        <BottomSheetView className="flex-1 px-5 pb-3 pt-3">
          <View className="self-start rounded-full bg-brand-soft px-3 py-1.5">
            <Text className="text-sm font-bold text-brand-strong">Hoje · {agendaClass.time}</Text>
          </View>
          <Text className="mt-2 text-[25px] font-bold leading-8 text-ink">{agendaClass.title}</Text>
          <Text className="mt-1 text-[17px] text-muted-ink">quarta-feira, 27 de agosto</Text>
          <View className="mt-4 overflow-hidden rounded-[20px] bg-[#F7F6F4]">
            {details.map((detail, index) => (
              <View
                key={detail.label}
                className={`min-h-[43px] flex-row items-center px-4 ${index ? "border-t border-border" : ""}`}
              >
                <Icon name={detail.icon} size={19} color="#7D7880" strokeWidth={2.1} />
                <Text className="ml-3 flex-1 text-[15px] text-muted-ink">{detail.label}</Text>
                <Text className="text-[15px] font-semibold text-ink">{detail.value}</Text>
              </View>
            ))}
          </View>
          <View className="mt-4 gap-2">
            <ActionButton
              icon="qr-code"
              label="Fazer check-in"
              primary
              onPress={() => {
                onClose();
                router.push("/check-in");
              }}
            />
            <ActionButton icon="calendar" label="Adicionar ao calendário" />
          </View>
          <Text className="mt-2 text-center text-[13px] text-muted-ink">
            O check-in abre 30 min antes da aula.
          </Text>
        </BottomSheetView>
      </BottomSheet>
    </Modal>
  );
}
