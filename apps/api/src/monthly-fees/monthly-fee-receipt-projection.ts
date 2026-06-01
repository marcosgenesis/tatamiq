export interface MonthlyFeeReceiptProjectionRow {
  id: string;
  status: string;
  createdAt: Date;
  rejectionReason: string | null;
  note: string | null;
}

export interface MonthlyFeeReceiptProjection<
  TReceipt extends MonthlyFeeReceiptProjectionRow = MonthlyFeeReceiptProjectionRow,
> {
  /** Existing UI order, preserved for receipt history rendering. */
  history: TReceipt[];
  /** Current pending Comprovante Pix, if one is awaiting Verificação de Pagamento. */
  activePendingReceipt: TReceipt | null;
  /** Existing student-visible receipt summary selection. */
  studentRelevantReceipt: TReceipt | null;
}

export function projectMonthlyFeeReceipts<TReceipt extends MonthlyFeeReceiptProjectionRow>(
  receipts: TReceipt[],
): MonthlyFeeReceiptProjection<TReceipt> {
  const newestFirst = [...receipts].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
  const activePendingReceipt = newestFirst.find((receipt) => receipt.status === "pending") ?? null;

  return {
    history: receipts,
    activePendingReceipt,
    studentRelevantReceipt:
      activePendingReceipt ??
      newestFirst.find((receipt) => receipt.status === "approved") ??
      newestFirst.find((receipt) => receipt.status === "rejected") ??
      null,
  };
}
