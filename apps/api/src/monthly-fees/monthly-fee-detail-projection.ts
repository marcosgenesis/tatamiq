import { projectMonthlyFeePaymentOrigin } from "./monthly-fee-payment-origin-projection";
import {
  type MonthlyFeeReceiptProjectionRow,
  projectMonthlyFeeReceipts,
} from "./monthly-fee-receipt-projection";
import { projectMonthlyFeeStatus } from "./monthly-fee-status-projection";

export interface MonthlyFeeDetailProjectionFee {
  id: string;
  organizationId: string;
  status: string;
  dueDate: string;
}

export interface MonthlyFeeDetailProjectionEvent {
  id: string;
  type: string;
  createdAt: Date;
}

export interface MonthlyFeeDetailProjectionInput<
  TFee extends MonthlyFeeDetailProjectionFee,
  TEvent extends MonthlyFeeDetailProjectionEvent,
  TReceipt extends MonthlyFeeReceiptProjectionRow,
> {
  organizationId: string;
  fee: TFee;
  events: TEvent[];
  receipts: TReceipt[];
  today?: Date;
}

export function projectMonthlyFeeDetail<
  TFee extends MonthlyFeeDetailProjectionFee,
  TEvent extends MonthlyFeeDetailProjectionEvent,
  TReceipt extends MonthlyFeeReceiptProjectionRow,
>(input: MonthlyFeeDetailProjectionInput<TFee, TEvent, TReceipt>) {
  if (input.fee.organizationId !== input.organizationId) return null;

  return {
    fee: input.fee,
    status: projectMonthlyFeeStatus(input.fee, input.today),
    paymentOrigin: projectMonthlyFeePaymentOrigin(input.fee, input.events),
    events: input.events,
    receipts: projectMonthlyFeeReceipts(input.receipts),
  };
}
