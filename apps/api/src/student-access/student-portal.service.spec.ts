import { describe, expect, it } from "vitest";
import { projectStudentAttendanceHistory } from "./student-portal.service";

function attendanceRow(id: string, classGroupId: string) {
  return {
    attendance: {
      id,
      organizationId: "org-1",
      classSessionId: `session-${id}`,
      studentId: "student-1",
      source: "qr",
      invalidatedAt: null,
      invalidatedByUserId: null,
      invalidationReason: null,
      createdByUserId: "user-1",
      createdAt: new Date("2026-06-15T12:00:00.000Z"),
    },
    classGroupId,
    classGroupName: `Turma ${classGroupId}`,
  };
}

describe("projectStudentAttendanceHistory", () => {
  it("marks attendance in an active class group as in-group", () => {
    const result = projectStudentAttendanceHistory(
      [attendanceRow("attendance-1", "group-1")],
      new Set(["group-1"]),
    );

    expect(result.attendances[0]).toMatchObject({
      id: "attendance-1",
      classGroupName: "Turma group-1",
      isOutOfGroup: false,
    });
  });

  it("marks attendance outside active class groups as out-of-group", () => {
    const result = projectStudentAttendanceHistory(
      [attendanceRow("attendance-2", "group-2")],
      new Set(["group-1"]),
    );

    expect(result.attendances[0]).toMatchObject({
      id: "attendance-2",
      classGroupName: "Turma group-2",
      isOutOfGroup: true,
    });
  });
});
