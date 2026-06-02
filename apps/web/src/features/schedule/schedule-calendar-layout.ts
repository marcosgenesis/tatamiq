import type { ScheduleOccurrence } from "@tatamiq/contracts";

export const HOUR_PX = 72;
export const FIRST_HOUR = 6;
export const LAST_HOUR = 23;
export const TOTAL_HOURS = LAST_HOUR - FIRST_HOUR;
export const GRID_HEIGHT = TOTAL_HOURS * HOUR_PX;
export const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => FIRST_HOUR + i);
export const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export type LayoutedEvent = {
  occurrence: ScheduleOccurrence;
  col: number;
  totalCols: number;
};

export function eventColorClasses(occ: ScheduleOccurrence): string {
  if (occ.status === "cancelled") return "bg-muted text-muted-foreground opacity-50";
  if (occ.status === "active") return "bg-emerald-600 text-white";
  if (occ.status === "ended") return "bg-muted text-muted-foreground opacity-60";
  return "bg-primary text-primary-foreground";
}

export function localStartMinutes(occ: ScheduleOccurrence): number {
  const d = new Date(occ.scheduledStartAt);
  return d.getHours() * 60 + d.getMinutes();
}

export function getEventPosition(occ: ScheduleOccurrence) {
  const m = localStartMinutes(occ);
  return {
    top: ((m - FIRST_HOUR * 60) / 60) * HOUR_PX,
    height: Math.max((occ.durationMinutes / 60) * HOUR_PX, 28),
  };
}

export function layoutDayEvents(occs: ScheduleOccurrence[]): LayoutedEvent[] {
  if (occs.length === 0) return [];
  const sorted = [...occs].sort((a, b) => localStartMinutes(a) - localStartMinutes(b));
  const colEnds: number[] = [];
  const result: LayoutedEvent[] = [];

  for (const occ of sorted) {
    const s = localStartMinutes(occ);
    const e = s + occ.durationMinutes;
    let col = colEnds.findIndex((ce) => s >= ce);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(e);
    } else {
      colEnds[col] = e;
    }
    result.push({ occurrence: occ, col, totalCols: 0 });
  }

  for (const item of result) {
    const s = localStartMinutes(item.occurrence);
    const e = s + item.occurrence.durationMinutes;
    let max = item.col;
    for (const other of result) {
      const os = localStartMinutes(other.occurrence);
      const oe = os + other.occurrence.durationMinutes;
      if (s < oe && e > os && other.col > max) max = other.col;
    }
    item.totalCols = max + 1;
  }

  for (const item of result) {
    const s = localStartMinutes(item.occurrence);
    const e = s + item.occurrence.durationMinutes;
    let groupMax = item.totalCols;
    for (const other of result) {
      const os = localStartMinutes(other.occurrence);
      const oe = os + other.occurrence.durationMinutes;
      if (s < oe && e > os && other.totalCols > groupMax) groupMax = other.totalCols;
    }
    item.totalCols = groupMax;
  }

  return result;
}

export function pointerYToMinutes(clientY: number, el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const y = clientY - rect.top;
  const raw = FIRST_HOUR * 60 + (y / HOUR_PX) * 60;
  return snapToGrid(Math.max(FIRST_HOUR * 60, Math.min(LAST_HOUR * 60 - 15, raw)));
}

export function snapToGrid(minutes: number, interval = 15): number {
  return Math.round(minutes / interval) * interval;
}

export function fmtMinutes(totalMin: number): string {
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}
