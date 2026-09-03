import { tatamiqTokens } from "@tatamiq/design-tokens";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";

const CORNER_SIZE = 38;
const CORNER_WIDTH = 3;

function ScannerCorner({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const isTop = position.startsWith("t");
  const isLeft = position.endsWith("l");

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: CORNER_SIZE,
        height: CORNER_SIZE,
        ...(isTop ? { top: -1 } : { bottom: -1 }),
        ...(isLeft ? { left: -1 } : { right: -1 }),
        ...(isTop
          ? {
              borderTopWidth: CORNER_WIDTH,
              borderTopLeftRadius: isLeft ? 18 : 0,
              borderTopRightRadius: isLeft ? 0 : 18,
            }
          : {
              borderBottomWidth: CORNER_WIDTH,
              borderBottomLeftRadius: isLeft ? 18 : 0,
              borderBottomRightRadius: isLeft ? 0 : 18,
            }),
        ...(isLeft ? { borderLeftWidth: CORNER_WIDTH } : { borderRightWidth: CORNER_WIDTH }),
        borderColor: tatamiqTokens.colors.brand,
      }}
    />
  );
}

function ScannerFrame() {
  return (
    <View className="h-[264px] w-[264px] items-center justify-center bg-[#141313]">
      <Icon name="qr-code" size={112} color="#282625" strokeWidth={4.2} />

      <View
        className="absolute left-[25px] right-[25px] top-1/2 h-[2px] bg-brand"
        style={{
          shadowColor: tatamiqTokens.colors.brand,
          shadowOpacity: 0.85,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
        }}
      />

      <ScannerCorner position="tl" />
      <ScannerCorner position="tr" />
      <ScannerCorner position="bl" />
      <ScannerCorner position="br" />
    </View>
  );
}

export default function CheckInScreen() {
  const router = useRouter();

  return (
    <Screen dark scroll={false}>
      <View className="relative flex-1">
        <View
          pointerEvents="none"
          className="absolute -top-20 left-1/2 h-40 w-[280px] -translate-x-1/2 rounded-full bg-brand/[0.025]"
          style={{
            shadowColor: tatamiqTokens.colors.brand,
            shadowOpacity: 0.06,
            shadowRadius: 70,
            shadowOffset: { width: 0, height: 60 },
          }}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          onPress={() => router.back()}
          className="-ml-1 -mt-2 h-10 w-10 items-center justify-center rounded-full bg-white/10"
        >
          <Icon name="arrow-left" size={24} color="#FFFFFF" strokeWidth={2.2} />
        </Pressable>

        <View className="absolute left-0 right-0 top-[187px] items-center">
          <Text className="text-center text-[23px] font-bold leading-[29px] text-white">
            Escaneie o QR da aula
          </Text>
          <Text className="mt-2 text-center text-[15px] leading-[21px] text-white/60">
            O professor mostra o código no início da aula.
          </Text>

          <View className="mt-6">
            <ScannerFrame />
          </View>

          <Text className="mt-9 text-center text-[14px] leading-5 text-white/50">
            Posicione o código dentro da moldura
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Inserir código manualmente"
          className="absolute -bottom-8 left-0 right-0 flex-row items-center justify-center gap-2 py-2"
        >
          <Icon name="keyboard" size={18} color="#B7B4B2" strokeWidth={2} />
          <Text className="text-[15px] font-semibold text-white/70">
            Inserir código manualmente
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
