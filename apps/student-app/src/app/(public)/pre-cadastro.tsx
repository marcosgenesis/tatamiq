import { Link } from "expo-router";
import { Text } from "react-native";

import { AppShell } from "@/components/app-shell";

export default function PreRegistrationScreen() {
  return (
    <AppShell eyebrow="Pré-cadastro" title="Entre para a sua academia">
      <Text className="text-base leading-6 text-muted-ink">
        Esta é a porta pública do app. O fluxo completo de dados, QR Code e acompanhamento será
        conectado aos contratos compartilhados nas próximas fatias.
      </Text>

      <Link href="/login" className="text-base font-semibold text-brand-strong">
        Acompanhar uma solicitação
      </Link>
    </AppShell>
  );
}
