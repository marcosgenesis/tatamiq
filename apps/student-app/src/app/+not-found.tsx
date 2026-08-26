import { Link } from "expo-router";
import { Text } from "react-native";

import { AppShell } from "@/components/app-shell";

export default function NotFoundScreen() {
  return (
    <AppShell eyebrow="Tatamiq Student" title="Página não encontrada">
      <Text className="text-base leading-6 text-muted-ink">
        O link pode ter expirado ou ainda não fazer parte da jornada nativa.
      </Text>
      <Link href="/" className="text-base font-semibold text-brand-strong">
        Voltar ao início
      </Link>
    </AppShell>
  );
}
