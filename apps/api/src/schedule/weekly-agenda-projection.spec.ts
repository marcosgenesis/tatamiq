import { describe, expect, it } from "vitest";
import {
  projectAgendaDays,
  projectWeeklyAgenda,
  weeklyAgendaRange,
} from "./weekly-agenda-projection";

const baseInput = {
  range: weeklyAgendaRange("2026-05-20"),
  scheduleRows: [
    {
      scheduleId: "sched-mon",
      weekday: 1,
      startTime: "08:00",
      classGroupId: "cg-1",
      classGroupName: "Adulto manhã",
      durationMinutes: 60,
    },
    {
      scheduleId: "sched-wed",
      weekday: 3,
      startTime: "19:30",
      classGroupId: "cg-1",
      classGroupName: "Adulto manhã",
      durationMinutes: 60,
    },
  ],
  adHocRows: [],
  recurringCancellations: [],
  recurringSessionRows: [],
  tagsByClassGroup: new Map([["cg-1", ["adulto", "iniciante"]]]),
  studentCountByClassGroup: new Map([["cg-1", 12]]),
  attendanceCountBySession: new Map<string, number>(),
};

describe("weekly agenda projection", () => {
  it("normalizes the requested date to a Monday-based week range", () => {
    const agenda = projectWeeklyAgenda(baseInput);

    expect(agenda.weekStart).toBe("2026-05-18");
    expect(agenda.days.map((day) => day.date)).toEqual([
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
      "2026-05-23",
      "2026-05-24",
    ]);
    expect(weeklyAgendaRange("2026-05-20")).toEqual({
      weekStart: "2026-05-18",
      weekEndExclusive: "2026-05-25",
    });
  });

  it("expands recurring Turma schedules on the correct weekdays and times", () => {
    const agenda = projectWeeklyAgenda(baseInput);

    expect(agenda.days[0]?.occurrences).toMatchObject([
      {
        id: "cg-1:sched-mon:2026-05-18",
        source: "recurring",
        status: "scheduled",
        scheduledStartAt: "2026-05-18T11:00:00.000Z",
        startTime: "08:00",
      },
    ]);
    expect(agenda.days[2]?.occurrences).toMatchObject([
      {
        id: "cg-1:sched-wed:2026-05-20",
        source: "recurring",
        scheduledStartAt: "2026-05-20T22:30:00.000Z",
        startTime: "19:30",
      },
    ]);
    expect(agenda.days[1]?.occurrences).toEqual([]);
  });

  it("keeps Aula Avulsa occurrences in the same week alongside recurring occurrences", () => {
    const agenda = projectWeeklyAgenda({
      ...baseInput,
      adHocRows: [
        {
          id: "adhoc-1",
          classGroupId: "cg-1",
          classGroupName: "Adulto manhã",
          scheduledStartAt: new Date("2026-05-20T21:00:00.000Z"),
          durationMinutes: 90,
          status: "scheduled",
        },
      ],
    });

    expect(agenda.days[2]?.occurrences.map((occurrence) => occurrence.id)).toEqual([
      "adhoc-1",
      "cg-1:sched-wed:2026-05-20",
    ]);
    expect(agenda.days[2]?.occurrences[0]).toMatchObject({
      source: "ad_hoc",
      classSessionId: "adhoc-1",
      durationMinutes: 90,
      startTime: "18:00",
    });
  });

  it("applies Cancelamento de Aula without silently removing the recurring occurrence", () => {
    const agenda = projectWeeklyAgenda({
      ...baseInput,
      recurringCancellations: [
        {
          id: "cancel-1",
          classGroupScheduleId: "sched-wed",
          occurrenceDate: "2026-05-20",
          revertedAt: null,
        },
      ],
    });

    expect(agenda.days[2]?.occurrences).toHaveLength(1);
    expect(agenda.days[2]?.occurrences[0]).toMatchObject({
      id: "cg-1:sched-wed:2026-05-20",
      status: "cancelled",
      cancellationId: "cancel-1",
    });
  });

  it("enriches occurrences with tags, student counts, session ids, and attendance counts", () => {
    const agenda = projectWeeklyAgenda({
      ...baseInput,
      recurringSessionRows: [
        {
          id: "session-1",
          classGroupId: "cg-1",
          scheduledStartAt: new Date("2026-05-20T22:30:00.000Z"),
          status: "active",
        },
      ],
      attendanceCountBySession: new Map([["session-1", 7]]),
    });

    expect(agenda.days[2]?.occurrences[0]).toMatchObject({
      status: "active",
      classSessionId: "session-1",
      studentCount: 12,
      attendanceCount: 7,
      tags: ["adulto", "iniciante"],
    });
  });

  it("projects arbitrary next-seven-day windows with the same occurrence rules", () => {
    const days = projectAgendaDays(
      {
        ...baseInput,
        recurringCancellations: [
          {
            id: "cancel-1",
            classGroupScheduleId: "sched-wed",
            occurrenceDate: "2026-05-20",
            revertedAt: null,
          },
        ],
        adHocRows: [
          {
            id: "adhoc-1",
            classGroupId: "cg-1",
            classGroupName: "Adulto manhã",
            scheduledStartAt: new Date("2026-05-21T10:00:00.000Z"),
            durationMinutes: 60,
            status: "scheduled",
          },
        ],
      },
      ["2026-05-20", "2026-05-21", "2026-05-22"],
    );

    expect(days.map((day) => day.date)).toEqual(["2026-05-20", "2026-05-21", "2026-05-22"]);
    expect(days[0]?.occurrences[0]).toMatchObject({ source: "recurring", status: "cancelled" });
    expect(days[1]?.occurrences[0]).toMatchObject({ id: "adhoc-1", source: "ad_hoc" });
  });
});
