export function getMondayWeekStart(date: string): string {
  const value = parseDateOnly(date);
  const day = value.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setUTCDate(value.getUTCDate() + diff);
  return formatDateOnly(value);
}

export function listWeekDates(weekStart: string): string[] {
  const start = parseDateOnly(getMondayWeekStart(weekStart));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return formatDateOnly(date);
  });
}

export function weekdayForDate(date: string): number {
  return parseDateOnly(date).getUTCDay();
}

export function toScheduledStartAt(date: string, startTime: string): string {
  return `${date}T${startTime}:00.000Z`;
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
