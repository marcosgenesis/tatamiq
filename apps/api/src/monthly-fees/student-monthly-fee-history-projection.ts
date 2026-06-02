import {
  type MonthlyFeeReceiptProjectionRow,
  projectMonthlyFeeReceipts,
} from "./monthly-fee-receipt-projection";
import { projectMonthlyFeeStatus } from "./monthly-fee-status-projection";

export interface StudentMonthlyFeeHistoryRow {
  id: string;
  organizationId: string;
  studentId: string;
  status: string;
  dueDate: string;
}

export interface StudentMonthlyFeeHistoryProjectionInput<
  TFee extends StudentMonthlyFeeHistoryRow,
  TReceipt extends MonthlyFeeReceiptProjectionRow,
> {
  rows: TFee[];
  receiptsByFee: Map<string, TReceipt[]>;
  organizationId: string;
  studentId: string;
  today?: Date;
}

export function projectStudentMonthlyFeeHistory<
  TFee extends StudentMonthlyFeeHistoryRow,
  TReceipt extends MonthlyFeeReceiptProjectionRow,
>(input: StudentMonthlyFeeHistoryProjectionInput<TFee, TReceipt>) {
  const today = input.today ?? new Date();
  const cutoffDate = studentMonthlyFeeHistoryCutoffDate(today);

  return input.rows
    .filter(
      (row) =>
        row.organizationId === input.organizationId &&
        row.studentId === input.studentId &&
        row.dueDate >= cutoffDate,
    )
    .map((row) => ({
      fee: row,
      status: projectMonthlyFeeStatus(row, today),
      receipts: projectMonthlyFeeReceipts(input.receiptsByFee.get(row.id) ?? []),
    }));
}

export function studentMonthlyFeeHistoryCutoffDate(today: Date = new Date()): string {
  const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  return `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;
}
