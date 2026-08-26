import { Link } from "expo-router";
import { Text } from "react-native";

import { AppShell } from "@/components/app-shell";

export default function StudentPlaceholderScreen() {
  return (
    <AppShell eyebrow="Área do aluno" title="Tudo pronto para a sua rotina">
      <Text className="text-base leading-6 text-muted-ink">
        Esta rota é o placeholder protegido do Student App. O guard de sessão será ligado ao Better
        Auth no adaptador nativo do próximo slice.
      </Text>

      <Link href="/pre-cadastro" className="text-base font-semibold text-brand-strong">
        Voltar para o pré-cadastro
      </Link>
    </AppShell>
  );
}
