import { tatamiqTokens } from "@tatamiq/design-tokens";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Stat } from "@/components/stat";

const belts = [
  { name: "Branca", color: "#ECECEC", current: true },
  { name: "Azul", color: "#A9C0E8", current: false },
  { name: "Roxa", color: "#C0A6E0", current: false },
  { name: "Marrom", color: "#C9AE93", current: false },
  { name: "Preta", color: "#9A9A9A", current: false },
] as const;

export default function GraduacaoScreen() {
  const router = useRouter();

  return (
    <Screen dark scroll={false}>
      <ScrollView
        className="-mx-6 -my-6"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View className="relative overflow-hidden rounded-b-[34px] bg-dark px-5 pb-[30px] pt-6">
          <View pointerEvents="none" style={styles.warmGlow} />

          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <Icon name="arrow-left" size={23} color="#FFFFFF" strokeWidth={2.25} />
          </Pressable>

          <Text className="mt-5 text-[12px] font-bold tracking-[3px] text-white/50">
            SUA GRADUAÇÃO
          </Text>

          <View className="mt-[18px] h-[52px] flex-row overflow-hidden rounded-[9px]">
            <View style={styles.whiteBelt} className="flex-1" />
            <View className="w-[26%] items-center justify-center bg-[#090909]">
              <View className="h-[28px] w-[5px] rounded-full bg-white" />
            </View>
          </View>

          <Text className="mt-6 text-[32px] font-bold leading-[38px] text-white">Faixa Branca</Text>
          <Text className="mt-2 text-[15px] font-medium text-white/55">
            Primeiro grau · desde agosto de 2024
          </Text>

          <View className="mt-[26px] flex-row items-end justify-between">
            <Text className="text-[11px] font-bold tracking-[2px] text-white/45">
              PROGRESSO ATÉ O 2º GRAU
            </Text>
            <Text className="text-[14px] font-bold text-brand">~6 meses</Text>
          </View>
          <View className="mt-[9px] h-2 overflow-hidden rounded-full bg-white/15">
            <View className="h-full w-[21%] rounded-full bg-brand" />
          </View>
        </View>

        <View className="bg-canvas px-5 pb-12 pt-6">
          <Text className="text-[19px] font-bold text-ink">Sua jornada</Text>
          <Text className="mt-0.5 text-[15px] text-muted-ink">Faltam 4 faixas para a preta</Text>

          <View className="mt-6 flex-row justify-between gap-2">
            {belts.map((belt) => (
              <View key={belt.name} className="flex-1 items-center">
                <View
                  className={`h-[52px] w-full items-center justify-center rounded-[12px] ${
                    belt.current ? "border-[3px] border-brand" : ""
                  }`}
                  style={{ backgroundColor: belt.color }}
                >
                  {belt.current ? (
                    <Icon name="check-circle" size={22} color={tatamiqTokens.colors.ink} />
                  ) : null}
                </View>
                <Text
                  className={`mt-3 text-[12px] ${
                    belt.current ? "font-bold text-ink" : "font-medium text-muted-ink"
                  }`}
                >
                  {belt.name}
                </Text>
              </View>
            ))}
          </View>

          <Card className="mt-6 flex-row px-0 py-5">
            <Stat value="6" label="meses" className="items-center" />
            <View className="w-px bg-border" />
            <Stat value="1º" label="grau atual" className="items-center" />
            <View className="w-px bg-border" />
            <Stat value="2" label="promoções" className="items-center" />
          </Card>

          <Text className="mt-7 text-[19px] font-bold text-ink">Linha do tempo</Text>

          <View className="mt-5 flex-row">
            <View className="w-8 items-center">
              <View
                className="z-10 h-4 w-4 rounded-full border-2 border-white bg-[#E7E7E7]"
                style={styles.dot}
              />
              <View className="absolute top-4 h-[86px] w-0.5 bg-[#E1DDD8]" />
            </View>
            <View className="flex-1 pl-1">
              <Text className="text-[16px] font-bold text-ink">1º grau · Faixa Branca</Text>
              <Text className="mt-1 text-[14px] text-muted-ink">15 de março de 2025</Text>
              <Card className="mt-3 flex-row gap-3 rounded-[18px] px-4 py-3.5">
                <Icon name="quote" size={20} color={tatamiqTokens.colors.brand} strokeWidth={2.2} />
                <Text className="flex-1 text-[14px] leading-5 text-[#5E5953]">
                  Boa evolução na guarda e nas passagens. Continue firme.
                </Text>
              </Card>
            </View>
          </View>

          <View className="mt-6 flex-row">
            <View className="w-8 items-center">
              <View
                className="h-4 w-4 rounded-full border-2 border-white bg-[#E7E7E7]"
                style={styles.dot}
              />
            </View>
            <View className="flex-1 pl-1">
              <Text className="text-[16px] font-bold text-ink">Faixa Branca</Text>
              <Text className="mt-1 text-[14px] text-muted-ink">10 de agosto de 2024</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    backgroundColor: tatamiqTokens.colors.canvas,
    flexGrow: 1,
  },
  warmGlow: {
    position: "absolute",
    top: 130,
    left: "25%",
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(244, 83, 28, 0.05)",
    shadowColor: tatamiqTokens.colors.brandStrong,
    shadowOpacity: 0.42,
    shadowRadius: 72,
    shadowOffset: { width: 0, height: 8 },
    transform: [{ scaleX: 1.2 }],
  },
  whiteBelt: {
    backgroundColor: "#EFEFEF",
  },
  dot: {
    shadowColor: tatamiqTokens.colors.brand,
    shadowOpacity: 0.22,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
});
