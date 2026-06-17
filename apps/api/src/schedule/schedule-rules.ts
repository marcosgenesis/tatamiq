export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;

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

export function toSaoPauloScheduledStartAt(date: string, startTime: string): string {
  // V0 is fixed to America/Sao_Paulo, which currently has no DST and is UTC-03.
  // Replace this with a timezone-aware academy setting if multi-timezone support is added.
  return new Date(`${date}T${startTime}:00.000-03:00`).toISOString();
}

export function saoPauloDatePart(date: Date): string {
  return new Date(date.getTime() - SAO_PAULO_OFFSET_MS).toISOString().slice(0, 10);
}

export function saoPauloTimePart(date: Date): string {
  return new Date(date.getTime() - SAO_PAULO_OFFSET_MS).toISOString().slice(11, 16);
}

export const toScheduledStartAt = toSaoPauloScheduledStartAt;

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
