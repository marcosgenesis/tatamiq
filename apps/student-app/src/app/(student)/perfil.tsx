import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { ListRow } from "@/components/list-row";
import { ProgressRing } from "@/components/progress-ring";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { authClient } from "@/lib/auth-client";

export default function PerfilScreen() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    try {
      const { error } = await authClient.signOut();

      if (error) {
        setIsSigningOut(false);
        Alert.alert("Não foi possível sair", "Tente novamente em instantes.");
      }
    } catch {
      setIsSigningOut(false);
      Alert.alert("Não foi possível sair", "Tente novamente em instantes.");
    }
  }

  function confirmSignOut() {
    Alert.alert("Sair da conta", "Você precisará entrar novamente para acessar o app.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <Screen>
      <View className="-mt-4">
        <ScreenHeader title="Perfil" />
      </View>

      <View className="-mt-4 gap-3">
        <View className="items-center">
          <View className="h-[94px] w-[94px] items-center justify-center rounded-full bg-brand-soft">
            <View className="h-[84px] w-[84px] items-center justify-center rounded-full bg-brand">
              <Text className="text-[34px] font-bold text-white">A</Text>
            </View>
          </View>
          <Text className="mt-3 text-[24px] font-bold leading-8 text-ink">Aluno Exemplo</Text>
          <Text className="text-base text-muted-ink">Legado Jiu Jitsu</Text>
          <View className="mt-3">
            <Badge variant="success">
              <Text className="text-sm font-semibold text-success">● Aluno ativo</Text>
            </Badge>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver graduação"
          onPress={() => router.push("/graduacao")}
        >
          <Card className="flex-row items-center gap-4 p-4">
            <ProgressRing progress={18} size={58} strokeWidth={6} label="1º" />
            <View className="flex-1">
              <Text className="text-lg font-bold text-ink">Faixa Branca</Text>
              <Text className="mt-0.5 text-sm text-muted-ink">1º grau · 18% para o 2º grau</Text>
            </View>
            <Icon name="chevron-right" color="#B8B3AD" size={22} />
          </Card>
        </Pressable>

        <View className="gap-3">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-xl font-bold text-ink">Meus dados</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Editar meus dados">
              <Text className="text-base font-semibold text-brand-strong">Editar</Text>
            </Pressable>
          </View>
          <Card className="p-0">
            <View className="min-h-14 flex-row items-center justify-between gap-4 px-5 py-4">
              <Text className="text-base text-muted-ink">Telefone</Text>
              <Text className="text-base font-semibold text-ink">(11) 98888-7777</Text>
            </View>
            <View className="h-px bg-border" />
            <View className="min-h-14 flex-row items-center justify-between gap-4 px-5 py-4">
              <Text className="text-base text-muted-ink">E-mail</Text>
              <Text className="text-base font-semibold text-ink">aluno@email.com</Text>
            </View>
          </Card>
        </View>

        <View className="gap-3">
          <Text className="px-1 text-xl font-bold text-ink">Conta</Text>
          <Card className="p-0 px-4">
            <ListRow
              icon="settings"
              title="Preferências"
              className="min-h-16 py-2"
              onPress={() => {}}
            />
            <View className="h-px bg-border" />
            <ListRow
              icon="help"
              title="Ajuda e suporte"
              className="min-h-16 py-2"
              onPress={() => {}}
            />
          </Card>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
          accessibilityState={{ busy: isSigningOut, disabled: isSigningOut }}
          disabled={isSigningOut}
          onPress={confirmSignOut}
          className="-mt-2 h-12 flex-row items-center justify-center gap-3 rounded-full bg-danger-soft"
        >
          {isSigningOut ? (
            <ActivityIndicator color="#E5484D" />
          ) : (
            <Icon name="log-out" color="#E5484D" size={22} strokeWidth={2.25} />
          )}
          <Text className="text-base font-bold text-danger">
            {isSigningOut ? "Saindo..." : "Sair da conta"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
