import type { CreateMonthlyFeeInput } from "@tatamiq/contracts";
import { api } from "../../api";
import type { FeeStatusFilter } from "./monthly-fees-types";

export const monthlyFeesKeys = {
  all: (academyId: string | null | undefined) =>
    ["academy", academyId ?? "no-academy", "monthly-fees"] as const,
  list: (academyId: string | null | undefined, status: FeeStatusFilter) =>
    [...monthlyFeesKeys.all(academyId), status] as const,
  detailRoot: (academyId: string | null | undefined) =>
    [...monthlyFeesKeys.all(academyId), "detail"] as const,
  detail: (academyId: string | null | undefined, feeId: string | null) =>
    [...monthlyFeesKeys.detailRoot(academyId), feeId] as const,
};

export async function fetchMonthlyFees(statusFilter: FeeStatusFilter) {
  const query = statusFilter === "all" ? {} : { status: statusFilter };
  const { data, error } = await api.GET("/monthly-fees", {
    params: { query },
  });
  if (error) throw new Error("Não foi possível carregar mensalidades.");
  return data;
}

export async function fetchMonthlyFeeDetail(feeId: string) {
  const { data, error } = await api.GET("/monthly-fees/{id}", {
    params: { path: { id: feeId } },
  });
  if (error) throw new Error("Não foi possível carregar o detalhe.");
  return data;
}

export async function createMonthlyFee(input: CreateMonthlyFeeInput) {
  const { data, error } = await api.POST("/monthly-fees", { body: input });
  if (error) throw new Error("Não foi possível criar a mensalidade.");
  return data;
}

export async function generateMissingMonthlyFees() {
  const { data, error } = await api.POST("/monthly-fees/generate-missing");
  if (error || !data) throw new Error("Não foi possível verificar mensalidades faltantes.");
  return data;
}

export async function adjustMonthlyFee(input: {
  id: string;
  amountInCents: number;
  reason: string;
}) {
  const { error } = await api.POST("/monthly-fees/{id}/adjust", {
    params: { path: { id: input.id } },
    body: { amountInCents: input.amountInCents, reason: input.reason },
  });
  if (error) throw new Error("Não foi possível ajustar.");
}

export async function waiveMonthlyFee(input: { id: string; reason: string }) {
  const { error } = await api.POST("/monthly-fees/{id}/waive", {
    params: { path: { id: input.id } },
    body: { reason: input.reason },
  });
  if (error) throw new Error("Não foi possível dispensar.");
}

export async function approveMonthlyFeeReceipt(input: { feeId: string; receiptId: string }) {
  const { error } = await api.POST("/monthly-fees/{id}/receipts/{receiptId}/approve", {
    params: { path: { id: input.feeId, receiptId: input.receiptId } },
  });
  if (error) throw new Error("Não foi possível aprovar.");
}

export async function rejectMonthlyFeeReceipt(input: {
  feeId: string;
  receiptId: string;
  reason: string;
}) {
  const { error } = await api.POST("/monthly-fees/{id}/receipts/{receiptId}/reject", {
    params: { path: { id: input.feeId, receiptId: input.receiptId } },
    body: { reason: input.reason },
  });
  if (error) throw new Error("Não foi possível rejeitar.");
}

export async function registerManualMonthlyFeePayment(input: { id: string; note: string }) {
  const { error } = await api.POST("/monthly-fees/{id}/manual-payment", {
    params: { path: { id: input.id } },
    body: { note: input.note },
  });
  if (error) throw new Error("Não foi possível marcar como pago.");
}

export async function fetchMonthlyFeeReceiptViewUrl(input: { feeId: string; receiptId: string }) {
  const { data, error } = await api.GET("/monthly-fees/{id}/receipts/{receiptId}/view-url", {
    params: { path: { id: input.feeId, receiptId: input.receiptId } },
  });
  if (error) throw new Error("Não foi possível abrir o comprovante.");
  return data.viewUrl;
}

export function monthlyFeesExportUrl(statusFilter: FeeStatusFilter) {
  const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3100";
  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  const qs = params.toString();
  return `${baseUrl}/monthly-fees/export.csv${qs ? `?${qs}` : ""}`;
}
