export type FeeStatusFilter = "all" | "open" | "under_review" | "paid" | "waived" | "overdue";

export type FeeFormState = {
  studentId: string;
  referenceYear: string;
  referenceMonth: string;
  amountInCents: string;
  dueDay: string;
};

export type MonthlyFeeActionType = "adjust" | "waive" | "manual_payment";
