import type { MonthlyFee } from "@appdosensei/contracts";
import type { StatusTone } from "@/components/mobile/mobile-ui";

/** Canonical mapping from a fee's state to its status badge (tone + label). */
export function feeStatusBadge(fee: Pick<MonthlyFee, "status" | "isOverdue">): {
  tone: StatusTone;
  label: string;
} {
  if (fee.isOverdue) return { tone: "error", label: "Atrasada" };
  switch (fee.status) {
    case "paid":
      return { tone: "success", label: "Pago" };
    case "under_review":
      return { tone: "info", label: "Em verificação" };
    case "waived":
      return { tone: "neutral", label: "Dispensado" };
    default:
      return { tone: "neutral", label: "Em aberto" };
  }
}
