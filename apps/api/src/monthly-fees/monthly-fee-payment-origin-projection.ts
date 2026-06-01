export type MonthlyFeePaymentOrigin = "manual_payment" | "receipt_approved";

export interface MonthlyFeePaymentOriginProjectionFee {
  status: string;
}

export interface MonthlyFeePaymentOriginProjectionEvent {
  type: string;
  createdAt: Date;
}

const PAYMENT_ORIGIN_BY_EVENT_TYPE: Record<string, MonthlyFeePaymentOrigin | undefined> = {
  manual_payment: "manual_payment",
  receipt_approved: "receipt_approved",
};

export function projectMonthlyFeePaymentOrigin(
  fee: MonthlyFeePaymentOriginProjectionFee,
  events: MonthlyFeePaymentOriginProjectionEvent[],
): MonthlyFeePaymentOrigin | null {
  if (fee.status !== "paid") return null;

  const newestPaymentEvent = [...events]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .find((event) => PAYMENT_ORIGIN_BY_EVENT_TYPE[event.type]);

  return newestPaymentEvent
    ? (PAYMENT_ORIGIN_BY_EVENT_TYPE[newestPaymentEvent.type] ?? null)
    : null;
}
