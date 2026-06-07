import type { ScheduleOccurrence, WeeklyScheduleResponse } from "@tatamiq/contracts";
import { findActiveRecurringCancellation } from "./schedule-cancellations";
import {
  getMondayWeekStart,
  listWeekDates,
  toScheduledStartAt,
  weekdayForDate,
} from "./schedule-rules";

export type AgendaScheduleRow = {
  scheduleId: string;
  weekday: number;
  startTime: string;
  classGroupId: string;
  classGroupName: string;
  durationMinutes: number;
};

export type AgendaAdHocRow = {
  id: string;
  classGroupId: string;
  classGroupName: string;
  scheduledStartAt: Date;
  durationMinutes: number;
  status: string;
};

export type AgendaRecurringCancellationRow = {
  id: string;
  classGroupScheduleId: string;
  occurrenceDate: string;
  revertedAt: Date | null;
};

export type AgendaRecurringSessionRow = {
  id: string;
  classGroupId: string;
  scheduledStartAt: Date;
  status: string;
};

export type WeeklyAgendaRange = {
  weekStart: string;
  weekEndExclusive: string;
};

export type WeeklyAgendaProjectionInput = {
  range: WeeklyAgendaRange;
  scheduleRows: AgendaScheduleRow[];
  adHocRows: AgendaAdHocRow[];
  recurringCancellations: AgendaRecurringCancellationRow[];
  recurringSessionRows: AgendaRecurringSessionRow[];
  tagsByClassGroup: Map<string, string[]>;
  studentCountByClassGroup: Map<string, number>;
  attendanceCountBySession: Map<string, number>;
};

export function projectWeeklyAgenda(input: WeeklyAgendaProjectionInput): WeeklyScheduleResponse {
  return {
    weekStart: input.range.weekStart,
    days: projectAgendaDays(input, listWeekDates(input.range.weekStart)),
  };
}

export function projectAgendaDays(
  input: WeeklyAgendaProjectionInput,
  dates: string[],
): WeeklyScheduleResponse["days"] {
  const recurringSessionMap = mapRecurringSessions(
    input.recurringSessionRows,
    input.attendanceCountBySession,
  );

  return dates.map((date) => ({
    date,
    weekday: weekdayForDate(date),
    occurrences: [
      ...expandRecurringOccurrencesForDate(input, date, recurringSessionMap),
      ...expandAdHocOccurrencesForDate(input, date),
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
}

export function weeklyAgendaRange(date: string): WeeklyAgendaRange {
  const weekStart = getMondayWeekStart(date);
  return {
    weekStart,
    weekEndExclusive: addDays(weekStart, 7),
  };
}

function expandRecurringOccurrencesForDate(
  input: WeeklyAgendaProjectionInput,
  date: string,
  recurringSessionMap: Map<string, { id: string; status: string; attendanceCount: number }>,
): ScheduleOccurrence[] {
  const weekday = weekdayForDate(date);
  return input.scheduleRows
    .filter((row) => row.weekday === weekday)
    .map((row) => {
      const sessionKey = recurringSessionKey(row.classGroupId, date);
      const sessionInfo = recurringSessionMap.get(sessionKey) ?? null;
      return toRecurringOccurrence(
        row,
        date,
        input.tagsByClassGroup,
        input.studentCountByClassGroup,
        findActiveRecurringCancellation(input.recurringCancellations, row.scheduleId, date),
        sessionInfo,
      );
    });
}

function expandAdHocOccurrencesForDate(
  input: WeeklyAgendaProjectionInput,
  date: string,
): ScheduleOccurrence[] {
  return input.adHocRows
    .filter((row) => row.scheduledStartAt.toISOString().slice(0, 10) === date)
    .map((row) =>
      toAdHocOccurrence(
        row,
        input.tagsByClassGroup,
        input.studentCountByClassGroup,
        input.attendanceCountBySession.get(row.id) ?? null,
      ),
    );
}

function mapRecurringSessions(
  rows: AgendaRecurringSessionRow[],
  attendanceCountBySession: Map<string, number>,
): Map<string, { id: string; status: string; attendanceCount: number }> {
  const map = new Map<string, { id: string; status: string; attendanceCount: number }>();
  for (const row of rows) {
    const key = recurringSessionKey(
      row.classGroupId,
      row.scheduledStartAt.toISOString().slice(0, 10),
    );
    map.set(key, {
      id: row.id,
      status: row.status,
      attendanceCount: attendanceCountBySession.get(row.id) ?? 0,
    });
  }
  return map;
}

function recurringSessionKey(classGroupId: string, date: string): string {
  return `${classGroupId}:${date}`;
}

export function toRecurringOccurrence(
  row: AgendaScheduleRow,
  date: string,
  tagsByClassGroup: Map<string, string[]>,
  studentCountByClassGroup: Map<string, number>,
  cancellation: AgendaRecurringCancellationRow | undefined,
  sessionInfo: { id: string; status: string; attendanceCount: number } | null,
): ScheduleOccurrence {
  const status = cancellation
    ? "cancelled"
    : sessionInfo
      ? (sessionInfo.status as "active" | "ended")
      : "scheduled";
  return {
    id: `${row.classGroupId}:${row.scheduleId}:${date}`,
    source: "recurring",
    status,
    classGroupId: row.classGroupId,
    classGroupName: row.classGroupName,
    scheduleId: row.scheduleId,
    classSessionId: sessionInfo?.id ?? null,
    cancellationId: cancellation?.id ?? null,
    scheduledDate: date,
    scheduledStartAt: toScheduledStartAt(date, row.startTime),
    startTime: row.startTime,
    durationMinutes: row.durationMinutes,
    studentCount: studentCountByClassGroup.get(row.classGroupId) ?? 0,
    attendanceCount: sessionInfo?.attendanceCount ?? null,
    tags: tagsByClassGroup.get(row.classGroupId) ?? [],
  };
}

export function toAdHocOccurrence(
  row: AgendaAdHocRow,
  tagsByClassGroup: Map<string, string[]>,
  studentCountByClassGroup: Map<string, number>,
  attendanceCount: number | null,
): ScheduleOccurrence {
  return {
    id: row.id,
    source: "ad_hoc",
    status: row.status as "scheduled" | "active" | "ended" | "cancelled",
    classGroupId: row.classGroupId,
    classGroupName: row.classGroupName,
    scheduleId: null,
    classSessionId: row.id,
    cancellationId: null,
    scheduledDate: row.scheduledStartAt.toISOString().slice(0, 10),
    scheduledStartAt: row.scheduledStartAt.toISOString(),
    startTime: row.scheduledStartAt.toISOString().slice(11, 16),
    durationMinutes: row.durationMinutes,
    studentCount: studentCountByClassGroup.get(row.classGroupId) ?? 0,
    attendanceCount,
    tags: tagsByClassGroup.get(row.classGroupId) ?? [],
  };
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
