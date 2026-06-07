// Presentation helpers shared by the student-portal screens.

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "Começa em 2h" / "Começa em 40 min" / "Em andamento" / null when far away or past. */
export function startsInLabel(iso: string, now: Date = new Date()): string | null {
  const diffMs = new Date(iso).getTime() - now.getTime();
  if (Number.isNaN(diffMs)) return null;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < -120) return null;
  if (minutes <= 0) return "Em andamento";
  if (minutes < 60) return `Começa em ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Começa em ${hours}h`;
  const days = Math.round(hours / 24);
  return `Começa em ${days} ${days === 1 ? "dia" : "dias"}`;
}

/** "faltam 4 dias" / "vence hoje" / "venceu há 2 dias" for a due date (date-only ISO). */
export function dueInLabel(dueDateIso: string, now: Date = new Date()): string {
  const due = new Date(`${dueDateIso.slice(0, 10)}T00:00:00`);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((due.getTime() - startOfToday.getTime()) / 86_400_000);
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  if (days > 1) return `faltam ${days} dias`;
  if (days === -1) return "venceu ontem";
  return `venceu há ${Math.abs(days)} dias`;
}

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[new Date(`${iso.slice(0, 10)}T12:00:00`).getDay()] ?? "";
}

export function dayOfMonth(iso: string): string {
  return String(new Date(`${iso.slice(0, 10)}T12:00:00`).getDate()).padStart(2, "0");
}
