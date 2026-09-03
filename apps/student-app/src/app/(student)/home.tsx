import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { ListRow } from "@/components/list-row";
import { ProgressRing } from "@/components/progress-ring";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View className="-mx-2 gap-3.5">
        <View className="mx-1 mb-0.5">
          <Text className="mb-0.5 text-[15px] font-medium text-muted-ink">Legado Jiu Jitsu</Text>
          <ScreenHeader
            title="Aluno"
            right={
              <View className="h-11 w-11 items-center justify-center rounded-full bg-brand">
                <Text className="text-xl font-semibold text-white">A</Text>
              </View>
            }
          />
        </View>

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
          <View className="h-[180px] overflow-hidden rounded-[24px] px-5 py-5">
            <Svg width="100%" height="100%" style={{ position: "absolute" }}>
              <Defs>
                <LinearGradient id="hero" x1="0" y1="1" x2="1" y2="0">
                  <Stop offset="0" stopColor="#C93500" />
                  <Stop offset="0.58" stopColor="#F4531C" />
                  <Stop offset="1" stopColor="#FF672D" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#hero)" />
              <Circle cx="105%" cy="20%" r="36%" fill="#FF7C4C" opacity={0.34} />
              <Circle cx="108%" cy="104%" r="31%" fill="#FF8050" opacity={0.35} />
            </Svg>

            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold tracking-[1.5px] text-white/85">PRÓXIMA AULA</Text>
              <View className="rounded-full bg-white/20 px-3 py-1.5">
                <Text className="text-sm font-semibold text-white">Hoje · 19:00</Text>
              </View>
            </View>
            <Text className="mt-2 text-[25px] font-bold leading-[31px] text-white">
              No-Gi · Noite
            </Text>
            <Text className="mt-1 text-[15px] text-white/90">
              quarta-feira · 60 min · Prof. Rafael
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/check-in")}
              className="mt-auto h-[50px] flex-row items-center justify-center gap-2 rounded-full bg-white"
            >
              <Icon name="qr-code" size={20} color="#C93500" strokeWidth={2.5} />
              <Text className="text-base font-bold text-brand-strong">Fazer check-in</Text>
            </Pressable>
          </View>
        </View>

        <Card className="h-[110px] flex-row items-center gap-4 px-4 py-3.5">
          <ProgressRing progress={18} size={74} strokeWidth={7} />
          <View className="flex-1">
            <Text className="text-lg font-bold text-ink">Faixa Branca</Text>
            <Text className="mt-0.5 text-sm text-muted-ink">
              1º grau · faltam ~6 meses para o 2º
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push("/graduacao")}
              className="mt-1.5 flex-row items-center self-start"
            >
              <Text className="text-sm font-semibold text-brand-strong">Ver graduação</Text>
              <Icon name="chevron-right" size={17} color="#D23A0A" />
            </Pressable>
          </View>
        </Card>

        <Card className="h-[72px] flex-row items-center px-4 py-2.5">
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-brand-soft">
              <Icon name="flame" size={21} color="#F4531C" strokeWidth={2.25} />
            </View>
            <View>
              <Text className="text-xl font-bold leading-6 text-ink">9</Text>
              <Text className="text-sm text-muted-ink">Presenças</Text>
            </View>
          </View>
          <View className="h-10 w-px bg-border" />
          <View className="flex-1 flex-row items-center gap-3 pl-3">
            <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-danger-soft">
              <Icon name="wallet" size={20} color="#E5484D" strokeWidth={2.25} />
            </View>
            <View>
              <Text className="text-lg font-bold leading-6 text-danger">Atraso</Text>
              <Text className="text-sm text-muted-ink">Mensalidade</Text>
            </View>
          </View>
        </Card>

        <View className="mt-2 flex-row items-center justify-between px-1">
          <Text className="text-lg font-bold text-ink">Atividade recente</Text>
          <Pressable accessibilityRole="button">
            <Text className="text-sm font-semibold text-muted-ink">Ver tudo</Text>
          </Pressable>
        </View>

        <Card className="overflow-hidden px-3 py-0">
          <ListRow
            icon="check-circle"
            title="Check-in confirmado"
            subtitle="No-Gi · Noite · 26 de ago."
            iconColor="#1E9E5A"
            iconBackgroundClassName="bg-success-soft"
            className="min-h-[64px] py-2"
          />
          <View className="ml-14 h-px bg-border" />
          <ListRow
            icon="wallet"
            title="Mensalidade paga"
            subtitle="08 de jul."
            className="min-h-[64px] py-2"
          />
        </Card>
      </View>
    </Screen>
  );
}
