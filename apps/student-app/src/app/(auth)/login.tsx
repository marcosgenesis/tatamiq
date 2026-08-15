import { Link } from "expo-router";
import { Text } from "react-native";

import { AppShell } from "@/components/app-shell";

export default function LoginScreen() {
  return (
    <AppShell eyebrow="Acesso" title="Entrar no Tatamiq">
      <Text className="text-base leading-6 text-muted-ink">
        O adaptador de sessão nativa e a definição de senha após aprovação entram no próximo slice
        de autenticação.
      </Text>

      <Link href="/aluno" className="text-base font-semibold text-brand-strong">
        Continuar para a área protegida de placeholder
      </Link>
    </AppShell>
  );
}
