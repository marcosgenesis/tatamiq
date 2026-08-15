import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AppShell } from "@/components/app-shell";

export default function HomeScreen() {
  return (
    <AppShell eyebrow="Tatamiq Student" title="Sua jornada começa aqui">
      <Text className="text-base leading-6 text-muted-ink">
        Acesso do aluno para pré-cadastro, ativação e rotina na academia em uma experiência nativa.
      </Text>

      <View className="gap-3">
        <Link href="/pre-cadastro" asChild>
          <Pressable className="rounded-2xl bg-brand px-5 py-4 active:opacity-80">
            <Text className="text-center text-base font-semibold text-white">
              Fazer pré-cadastro
            </Text>
          </Pressable>
        </Link>

        <Link href="/aluno" asChild>
          <Pressable className="rounded-2xl border border-brand px-5 py-4 active:opacity-80">
            <Text className="text-center text-base font-semibold text-brand">
              Abrir área do aluno
            </Text>
          </Pressable>
        </Link>
      </View>

      <Link href="/login" className="text-center text-sm font-medium text-brand-strong">
        Já tenho acesso
      </Link>
    </AppShell>
  );
}
