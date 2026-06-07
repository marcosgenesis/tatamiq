import type { MonthlyFee } from "@tatamiq/contracts";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { formatCurrency, formatDate, monthNames } from "../../lib/formatting";

const statusLabels: Record<string, string> = {
  open: "Em aberto",
  under_review: "Em verificação",
  paid: "Pago",
  waived: "Dispensado",
};

export function MonthlyFeeRow(props: {
  fee: MonthlyFee;
  onAdjust: () => void;
  onWaive: () => void;
  onManualPay: () => void;
  onReview: () => void;
}) {
  const fee = props.fee;
  const displayStatus = fee.isOverdue ? "Atrasada" : (statusLabels[fee.status] ?? fee.status);
  const badgeVariant = fee.isOverdue
    ? "destructive"
    : fee.status === "paid"
      ? "default"
      : fee.status === "under_review"
        ? "warning"
        : fee.status === "waived"
          ? "muted"
          : "secondary";
  const isOpen = fee.status === "open";

  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] md:items-center">
      <strong>{fee.studentName}</strong>
      <span className="text-sm text-muted-foreground">
        {monthNames[fee.referenceMonth - 1]} {fee.referenceYear}
      </span>
      <span className="text-sm text-muted-foreground">
        {formatCurrency(fee.amountInCents)}
        {fee.originalAmountInCents ? (
          <span className="ml-1 line-through text-xs text-muted-foreground/60">
            {formatCurrency(fee.originalAmountInCents)}
          </span>
        ) : null}
      </span>
      <span className="text-sm text-muted-foreground">{formatDate(fee.dueDate)}</span>
      <div>
        <Badge variant={badgeVariant as "default"}>{displayStatus}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {fee.status === "under_review" ? (
          <Button type="button" variant="secondary" size="sm" onClick={props.onReview}>
            Revisar
          </Button>
        ) : null}
        {isOpen ? (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={props.onAdjust}>
              Ajustar
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={props.onManualPay}>
              Pagar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={props.onWaive}>
              Dispensar
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
