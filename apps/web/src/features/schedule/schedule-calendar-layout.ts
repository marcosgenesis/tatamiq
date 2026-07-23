import type { ScheduleOccurrence } from "@tatamiq/contracts";

/** Minutes since midnight for an occurrence's local start time ("HH:MM"). */
export function localStartMinutes(occ: ScheduleOccurrence): number {
  const [hours = 0, minutes = 0] = occ.startTime.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Formats a minutes-since-midnight value as "HH:MM". */
export function fmtMinutes(totalMin: number): string {
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}
