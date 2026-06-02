import type { MonthlyFeeStatus } from "@tatamiq/contracts";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export type MonthlyFeeProjectedStatus = MonthlyFeeStatus | "overdue";

export interface MonthlyFeeStatusProjectionInput {
  status: string;
  dueDate: string;
}

export interface MonthlyFeeStatusProjection {
  persistedStatus: MonthlyFeeStatus;
  projectedStatus: MonthlyFeeProjectedStatus;
  isOverdue: boolean;
}

/**
 * Projects the user-visible Status Financeiro do Mês from persisted Mensalidade state.
 *
 * ADR-0009 keeps `overdue` derived instead of persisted: only an open Mensalidade
 * whose due date is before today's America/Sao_Paulo date projects as overdue.
 */
export function projectMonthlyFeeStatus(
  input: MonthlyFeeStatusProjectionInput,
  today: Date = new Date(),
): MonthlyFeeStatusProjection {
  const persistedStatus = parseMonthlyFeeStatus(input.status);
  const isOverdue = isMonthlyFeeOverdue(persistedStatus, input.dueDate, today);

  return {
    persistedStatus,
    projectedStatus: isOverdue ? "overdue" : persistedStatus,
    isOverdue,
  };
}

export function isMonthlyFeeOverdue(
  status: string,
  dueDate: string,
  today: Date = new Date(),
): boolean {
  if (status !== "open") return false;
  return dueDate < todayInSaoPaulo(today);
}

export function todayInSaoPaulo(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: SAO_PAULO_TIME_ZONE });
}

function parseMonthlyFeeStatus(status: string): MonthlyFeeStatus {
  const valid: MonthlyFeeStatus[] = ["open", "under_review", "paid", "waived"];
  if (valid.includes(status as MonthlyFeeStatus)) return status as MonthlyFeeStatus;
  throw new Error(`Invalid monthly fee status: ${status}`);
}
