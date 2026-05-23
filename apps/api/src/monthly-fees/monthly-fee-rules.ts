import { BadRequestException } from "@nestjs/common";

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
  if (status !== "open") return false;
  const due = parseDateOnly(dueDate);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return current > due;
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

export type FeeStatusTransition = "adjust" | "waive" | "manual_payment";

export function validateStatusTransition(currentStatus: string, action: FeeStatusTransition): void {
  if (currentStatus !== "open") {
    const labels: Record<FeeStatusTransition, string> = {
      adjust: "ajustada",
      waive: "dispensada",
      manual_payment: "marcada como paga",
    };
    throw new BadRequestException(
      `Mensalidade só pode ser ${labels[action]} quando está em aberto.`,
    );
  }
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
