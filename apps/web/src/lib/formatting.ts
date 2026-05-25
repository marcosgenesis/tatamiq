import type { Student } from "@tatamiq/contracts";

export const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function reaisToCents(value: string): number | null {
  if (!value.trim()) return null;
  const normalized = value.replace(".", "").replace(",", ".");
  return Math.round(Number(normalized) * 100);
}

export function centsToReais(value: number | null): string {
  if (value === null) return "";
  return (value / 100).toFixed(2).replace(".", ",");
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

export function ageLabel(birthDate: string): string {
  const birth = new Date(`${birthDate}T00:00:00.000Z`);
  const today = new Date();
  let age = today.getFullYear() - birth.getUTCFullYear();
  const birthdayPassed =
    today.getMonth() > birth.getUTCMonth() ||
    (today.getMonth() === birth.getUTCMonth() && today.getDate() >= birth.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return `${age} anos`;
}

export function billingLabel(student: Student): string {
  if (student.monthlyAmountInCents === null && student.monthlyDueDay === null)
    return "Sem mensalidade";
  const amount =
    student.monthlyAmountInCents === null
      ? "valor livre"
      : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
          student.monthlyAmountInCents / 100,
        );
  const dueDay = student.monthlyDueDay ? `dia ${student.monthlyDueDay}` : "sem vencimento";
  return `${amount} · ${dueDay}`;
}
