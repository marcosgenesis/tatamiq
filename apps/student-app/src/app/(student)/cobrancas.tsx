import { Pressable, Text, View } from "react-native";
import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { Icon, type IconName } from "@/components/icon";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";

type ChargeStatus = "Atrasada" | "Pendente" | "Pago";

const charges: Array<{
  title: string;
  subtitle: string;
  amount: string;
  status: ChargeStatus;
}> = [
  {
    title: "Mensalidade · Agosto 2025",
    subtitle: "Venceu 05/08",
    amount: "R$ 180,00",
    status: "Atrasada",
  },
  {
    title: "Diária · Treino 12/08",
    subtitle: "Pendente",
    amount: "R$ 25,00",
    status: "Pendente",
  },
  {
    title: "Mensalidade · Julho 2025",
    subtitle: "Pago em 08/07",
    amount: "R$ 180,00",
    status: "Pago",
  },
];

const statusTextClass: Record<ChargeStatus, string> = {
  Atrasada: "text-danger",
  Pendente: "text-warning",
  Pago: "text-success",
};

function ActionButton({
  label,
  icon,
  primary = false,
}: {
  label: string;
  icon: IconName;
  primary?: boolean;
}) {
  const color = primary ? "#FFFFFF" : "#1C1A17";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`h-14 flex-row items-center justify-center gap-3 rounded-full ${
        primary ? "bg-brand" : "border border-border bg-surface"
      }`}
    >
      <Icon name={icon} size={23} color={color} strokeWidth={2.25} />
      <Text className={`text-base font-bold ${primary ? "text-white" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}

export default function CobrancasScreen() {
  return (
    <Screen>
      <View className="gap-6">
        <ScreenHeader title="Cobranças" subtitle="Mantenha suas mensalidades em dia" />

        <Card className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-muted-ink">Total em aberto</Text>
            <Badge variant="danger">1 atrasada</Badge>
          </View>

          <View>
            <Text className="text-[36px] font-bold leading-[44px] text-ink">R$ 180,00</Text>
            <Text className="mt-1 text-[15px] font-semibold text-danger">
              Venceu em 05/08 · atrasada há 22 dias
            </Text>
          </View>

          <View className="gap-3 pt-1">
            <ActionButton label="Copiar chave Pix" icon="copy" primary />
            <ActionButton label="Enviar comprovante" icon="camera" />
          </View>
        </Card>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-ink">Suas cobranças</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Ver histórico">
            <Text className="text-base font-semibold text-muted-ink">Histórico</Text>
          </Pressable>
        </View>

        <Card className="p-0">
          {charges.map((charge, index) => (
            <View
              key={charge.title}
              className={`min-h-[78px] flex-row items-center justify-between gap-3 px-4 py-3 ${
                index < charges.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-ink">{charge.title}</Text>
                <Text className="mt-1 text-sm text-muted-ink">{charge.subtitle}</Text>
              </View>
              <View className="items-end">
                <Text className="text-base font-bold text-ink">{charge.amount}</Text>
                <Text className={`mt-1 text-sm font-semibold ${statusTextClass[charge.status]}`}>
                  {charge.status}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}
