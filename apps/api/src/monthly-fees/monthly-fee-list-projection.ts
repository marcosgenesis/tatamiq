import type { ListMonthlyFeesResponse } from "@tatamiq/contracts";
import { projectMonthlyFeeStatus } from "./monthly-fee-status-projection";

export interface MonthlyFeeListProjectionFee {
  organizationId: string;
  status: string;
  dueDate: string;
}

export interface MonthlyFeeListProjectionRow<TFee extends MonthlyFeeListProjectionFee> {
  fee: TFee;
  studentName: string;
}

export interface MonthlyFeeListProjectionFilters {
  organizationId: string;
  status?: string;
  today?: Date;
}

export function projectMonthlyFeeList<TFee extends MonthlyFeeListProjectionFee>(
  rows: MonthlyFeeListProjectionRow<TFee>[],
  summaryRows: MonthlyFeeListProjectionFee[],
  filters: MonthlyFeeListProjectionFilters,
): {
  rows: MonthlyFeeListProjectionRow<TFee>[];
  summary: ListMonthlyFeesResponse["summary"];
} {
  const today = filters.today ?? new Date();

  return {
    rows: filterMonthlyFeeListRows(rows, { ...filters, today }),
    summary: summarizeMonthlyFeeRows(summaryRows, filters.organizationId, today),
  };
}

export function filterMonthlyFeeListRows<TFee extends MonthlyFeeListProjectionFee>(
  rows: MonthlyFeeListProjectionRow<TFee>[],
  filters: MonthlyFeeListProjectionFilters,
): MonthlyFeeListProjectionRow<TFee>[] {
  const today = filters.today ?? new Date();

  return rows.filter(
    (row) =>
      row.fee.organizationId === filters.organizationId &&
      monthlyFeeMatchesStatusFilter(row.fee, filters.status, today),
  );
}

export function summarizeMonthlyFeeRows(
  rows: MonthlyFeeListProjectionFee[],
  organizationId: string,
  today: Date = new Date(),
): ListMonthlyFeesResponse["summary"] {
  const summary: ListMonthlyFeesResponse["summary"] = {
    open: 0,
    overdue: 0,
    underReview: 0,
    paid: 0,
    waived: 0,
    total: 0,
  };

  for (const row of rows) {
    if (row.organizationId !== organizationId) continue;

    summary.total++;
    const projection = projectMonthlyFeeStatus(row, today);
    if (projection.projectedStatus === "open") summary.open++;
    else if (projection.projectedStatus === "overdue") summary.overdue++;
    else if (projection.projectedStatus === "under_review") summary.underReview++;
    else if (projection.projectedStatus === "paid") summary.paid++;
    else if (projection.projectedStatus === "waived") summary.waived++;
  }

  return summary;
}

export function monthlyFeeMatchesStatusFilter(
  row: MonthlyFeeListProjectionFee,
  status: string | undefined,
  today: Date = new Date(),
): boolean {
  if (!status || status === "all") return true;
  if (status === "overdue") return projectMonthlyFeeStatus(row, today).isOverdue;
  return row.status === status;
}
