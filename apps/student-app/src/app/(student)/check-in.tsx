import { useQueryClient } from "@tanstack/react-query";
import { tatamiqTokens } from "@tatamiq/design-tokens";
import { type BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "@/api";
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

function ScannerFrame({
  onBarcodeScanned,
  isProcessing,
}: {
  onBarcodeScanned?: (result: BarcodeScanningResult) => void;
  isProcessing: boolean;
}) {
  return (
    <View className="h-[264px] w-[264px] overflow-hidden bg-[#141313]">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={onBarcodeScanned}
      />

      <View pointerEvents="none" className="absolute inset-0 bg-black/25" />

      <View
        pointerEvents="none"
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

      {isProcessing ? (
        <View className="absolute inset-0 items-center justify-center bg-black/45">
          <ActivityIndicator color="#FFFFFF" />
          <Text className="mt-3 text-sm font-semibold text-white">Validando check-in...</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function CheckInScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<"ready" | "submitting" | "error">("ready");
  const [scanError, setScanError] = useState("QR Code inválido ou expirado.");

  async function handleBarcodeScanned({ data }: BarcodeScanningResult) {
    if (scanState !== "ready" || !data.trim()) return;

    setScanState("submitting");
    const result = await api.POST("/student/attendances/qr", {
      body: { token: data.trim() },
    });

    if (!result.data) {
      setScanError(getScanErrorMessage());
      setScanState("error");
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["student"] });
    Alert.alert(
      "Check-in confirmado",
      `${result.data.classSession.classGroupName} · Presença registrada com sucesso.`,
      [{ text: "Continuar", onPress: () => router.back() }],
    );
  }

  function resetScanner() {
    setScanError("QR Code inválido ou expirado.");
    setScanState("ready");
  }

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
            {permission?.granted ? (
              <ScannerFrame
                onBarcodeScanned={scanState === "ready" ? handleBarcodeScanned : undefined}
                isProcessing={scanState === "submitting"}
              />
            ) : (
              <CameraPermissionPrompt
                permissionKnown={Boolean(permission)}
                canAskAgain={permission?.canAskAgain ?? true}
                onRequestPermission={() => void requestPermission()}
                onOpenSettings={() => void Linking.openSettings()}
              />
            )}
          </View>

          {scanState === "error" ? (
            <View className="mt-5 items-center">
              <Text className="text-center text-sm font-semibold text-danger">{scanError}</Text>
              <Pressable onPress={resetScanner} className="mt-3 rounded-full bg-white/10 px-4 py-2">
                <Text className="text-sm font-semibold text-white">Escanear novamente</Text>
              </Pressable>
            </View>
          ) : (
            <Text className="mt-9 text-center text-[14px] leading-5 text-white/50">
              Posicione o código dentro da moldura
            </Text>
          )}
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

function CameraPermissionPrompt({
  permissionKnown,
  canAskAgain,
  onRequestPermission,
  onOpenSettings,
}: {
  permissionKnown: boolean;
  canAskAgain: boolean;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <View className="h-[264px] w-[264px] items-center justify-center bg-[#141313] px-7">
      <Icon name="camera" size={46} color="#F4531C" strokeWidth={2} />
      <Text className="mt-4 text-center text-base font-semibold text-white">
        {permissionKnown ? "A câmera é necessária" : "Preparando a câmera..."}
      </Text>
      {permissionKnown ? (
        <Pressable
          accessibilityRole="button"
          onPress={canAskAgain ? onRequestPermission : onOpenSettings}
          className="mt-4 rounded-full bg-brand px-4 py-2.5"
        >
          <Text className="text-sm font-bold text-white">
            {canAskAgain ? "Permitir câmera" : "Abrir ajustes"}
          </Text>
        </Pressable>
      ) : (
        <ActivityIndicator className="mt-4" color="#F4531C" />
      )}
    </View>
  );
}

function getScanErrorMessage(): string {
  return "QR Code inválido ou expirado.";
}
