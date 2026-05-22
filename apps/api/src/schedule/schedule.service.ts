import { Inject, Injectable } from "@nestjs/common";
import type {
  ScheduleOccurrence,
  TodayScheduleResponse,
  WeeklyScheduleResponse,
} from "@tatamiq/contracts";
import {
  classGroupSchedules,
  classGroups,
  classGroupTags,
  type Database,
  studentClassGroups,
} from "@tatamiq/database";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import {
  getMondayWeekStart,
  listWeekDates,
  toScheduledStartAt,
  weekdayForDate,
} from "./schedule-rules";

type ClassGroupScheduleJoin = {
  scheduleId: string;
  weekday: number;
  startTime: string;
  classGroupId: string;
  classGroupName: string;
  durationMinutes: number;
};

@Injectable()
export class ScheduleService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async week(organizationId: string, weekStartInput?: string): Promise<WeeklyScheduleResponse> {
    const weekStart = getMondayWeekStart(weekStartInput ?? new Date().toISOString().slice(0, 10));
    const days = listWeekDates(weekStart);
    const scheduleRows = await this.activeScheduleRows(organizationId);
    const classGroupIds = [...new Set(scheduleRows.map((row) => row.classGroupId))];
    const tagsByClassGroup = await this.tagsByClassGroup(classGroupIds);
    const studentCountByClassGroup = await this.studentCountByClassGroup(
      organizationId,
      classGroupIds,
    );

    return {
      weekStart,
      days: days.map((date) => ({
        date,
        weekday: weekdayForDate(date),
        occurrences: scheduleRows
          .filter((row) => row.weekday === weekdayForDate(date))
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map((row) => toOccurrence(row, date, tagsByClassGroup, studentCountByClassGroup)),
      })),
    };
  }

  async today(organizationId: string): Promise<TodayScheduleResponse> {
    const date = new Date().toISOString().slice(0, 10);
    const week = await this.week(organizationId, date);
    return {
      date,
      occurrences: week.days.find((day) => day.date === date)?.occurrences ?? [],
    };
  }

  private async activeScheduleRows(organizationId: string): Promise<ClassGroupScheduleJoin[]> {
    return this.db
      .select({
        scheduleId: classGroupSchedules.id,
        weekday: classGroupSchedules.weekday,
        startTime: classGroupSchedules.startTime,
        classGroupId: classGroups.id,
        classGroupName: classGroups.name,
        durationMinutes: classGroups.defaultDurationMinutes,
      })
      .from(classGroupSchedules)
      .innerJoin(classGroups, eq(classGroups.id, classGroupSchedules.classGroupId))
      .where(and(eq(classGroups.organizationId, organizationId), eq(classGroups.status, "active")));
  }

  private async tagsByClassGroup(classGroupIds: string[]): Promise<Map<string, string[]>> {
    if (classGroupIds.length === 0) return new Map();
    const tags = await this.db
      .select({ classGroupId: classGroupTags.classGroupId, label: classGroupTags.label })
      .from(classGroupTags)
      .where(inArray(classGroupTags.classGroupId, classGroupIds));

    const map = new Map<string, string[]>();
    for (const tag of tags) {
      map.set(tag.classGroupId, [...(map.get(tag.classGroupId) ?? []), tag.label]);
    }
    return map;
  }

  private async studentCountByClassGroup(
    organizationId: string,
    classGroupIds: string[],
  ): Promise<Map<string, number>> {
    if (classGroupIds.length === 0) return new Map();
    const links = await this.db
      .select({ classGroupId: studentClassGroups.classGroupId })
      .from(studentClassGroups)
      .where(
        and(
          eq(studentClassGroups.organizationId, organizationId),
          inArray(studentClassGroups.classGroupId, classGroupIds),
          isNull(studentClassGroups.activeUntil),
        ),
      );

    const map = new Map<string, number>();
    for (const link of links) {
      map.set(link.classGroupId, (map.get(link.classGroupId) ?? 0) + 1);
    }
    return map;
  }
}

function toOccurrence(
  row: ClassGroupScheduleJoin,
  date: string,
  tagsByClassGroup: Map<string, string[]>,
  studentCountByClassGroup: Map<string, number>,
): ScheduleOccurrence {
  return {
    id: `${row.classGroupId}:${row.scheduleId}:${date}`,
    classGroupId: row.classGroupId,
    classGroupName: row.classGroupName,
    scheduledDate: date,
    scheduledStartAt: toScheduledStartAt(date, row.startTime),
    startTime: row.startTime,
    durationMinutes: row.durationMinutes,
    studentCount: studentCountByClassGroup.get(row.classGroupId) ?? 0,
    tags: tagsByClassGroup.get(row.classGroupId) ?? [],
  };
}
