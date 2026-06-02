import { BadRequestException } from "@nestjs/common";
import { isMonthlyFeeOverdue } from "./monthly-fee-status-projection";

export function clampDueDay(dueDay: number, year: number, month: number): Date {
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(dueDay, lastDayOfMonth);
  return new Date(year, month - 1, clampedDay);
}

export function formatDueDate(dueDate: Date): string {
  const y = dueDate.getFullYear();
  const m = String(dueDate.getMonth() + 1).padStart(2, "0");
  const d = String(dueDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isOverdue(status: string, dueDate: string, today = new Date()): boolean {
  return isMonthlyFeeOverdue(status, dueDate, today);
}

export function validateCanCreateFee(student: {
  status: string;
  monthlyAmountInCents: number | null;
  monthlyDueDay: number | null;
}): void {
  if (!student.monthlyAmountInCents || !student.monthlyDueDay) {
    throw new BadRequestException(
      "Aluno precisa ter valor mensal e dia de vencimento configurados.",
    );
  }
}
