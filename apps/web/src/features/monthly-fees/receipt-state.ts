import type { MonthlyFeeDetail, PaymentReceipt, StudentMonthlyFee } from "@tatamiq/contracts";

type FeeLike = Pick<StudentMonthlyFee, "status" | "isOverdue" | "lastReceipt">;

type DetailLike = Pick<MonthlyFeeDetail, "status" | "receipts">;

export type ReceiptUiStatus =
  | "can_send"
  | "uploading"
  | "can_replace"
  | "under_review"
  | "paid"
  | "waived"
  | "error";

export function deriveStudentReceiptStatus(fee: FeeLike, isUploading = false): ReceiptUiStatus {
  if (isUploading) return "uploading";
  if (fee.status === "paid") return "paid";
  if (fee.status === "waived") return "waived";
  if (fee.status === "under_review") return "can_replace";
  if (fee.status === "open") return "can_send";
  return "error";
}

export function activePendingReceipt(fee: DetailLike): PaymentReceipt | null {
  return fee.receipts.find((receipt) => receipt.status === "pending") ?? null;
}

export function receiptHistory(fee: DetailLike): PaymentReceipt[] {
  return fee.receipts
    .filter((receipt) => receipt.status !== "pending")
    .slice()
    .reverse();
}

export function studentReceiptCta(status: ReceiptUiStatus): string | null {
  if (status === "can_send") return "Enviar comprovante";
  if (status === "can_replace") return "Substituir comprovante";
  if (status === "uploading") return "Enviando...";
  return null;
}

export function studentLastReceiptMessage(fee: FeeLike): string | null {
  const receipt = fee.lastReceipt;
  if (!receipt) return null;
  if (receipt.status === "pending") return "Comprovante em verificação.";
  if (receipt.status === "approved") return "Comprovante aprovado.";
  if (receipt.status === "rejected") return receipt.rejectionReason ?? "Comprovante rejeitado.";
  return null;
}
