import type { EligibleStudent, GraduationSummaryResponse } from "@tatamiq/contracts";
import { calculateAge, calculateEligibility, monthsBetween } from "./eligibility-rules";

type ProjectionStudent = {
  id: string;
  name: string;
  birthDate: string;
  enrollmentDate: string;
  currentDegree: number;
  degreeEligibilityDismissedUntil: Date | null;
  beltEligibilityDismissedUntil: Date | null;
  transitionDismissedUntil: Date | null;
};

type ProjectionBelt = {
  id: string;
  name: string;
  path: "adult" | "child";
  maxDegrees: number;
  minMonthsForNextDegree: number;
  minAttendancesForNextDegree: number;
  minMonthsForNextBelt: number;
  minAttendancesForNextBelt: number;
};

type ProjectionAttendance = {
  createdAt: Date;
  invalidatedAt: Date | null;
};

export type GraduationEligibilityProjectionRow = {
  student: ProjectionStudent;
  belt: ProjectionBelt;
  latestPromotionAt: string | null;
  attendances: ProjectionAttendance[];
};

export type GraduationEligibilityProjection = {
  students: EligibleStudent[];
  summary: GraduationSummaryResponse;
};

export function projectGraduationEligibility(
  rows: GraduationEligibilityProjectionRow[],
  childToAdultAge: number,
  now: Date = new Date(),
): GraduationEligibilityProjection {
  const students: EligibleStudent[] = [];

  for (const row of rows) {
    const referenceDate = row.latestPromotionAt
      ? new Date(row.latestPromotionAt)
      : new Date(row.student.enrollmentDate);

    const attendancesSinceReference = row.attendances.filter(
      (attendance) => !attendance.invalidatedAt && attendance.createdAt >= referenceDate,
    ).length;

    const monthsSinceReference = monthsBetween(referenceDate, now);
    const age = calculateAge(new Date(row.student.birthDate), now);

    const result = calculateEligibility(
      row.belt,
      {
        currentDegree: row.student.currentDegree,
        monthsSinceReference,
        attendancesSinceReference,
        age,
        childToAdultAge,
        degreeEligibilityDismissedUntil: row.student.degreeEligibilityDismissedUntil,
        beltEligibilityDismissedUntil: row.student.beltEligibilityDismissedUntil,
        transitionDismissedUntil: row.student.transitionDismissedUntil,
      },
      now,
    );

    const base = {
      id: row.student.id,
      name: row.student.name,
      currentBeltId: row.belt.id,
      currentBeltName: row.belt.name,
      currentBeltPath: row.belt.path,
      currentDegree: row.student.currentDegree,
      monthsSinceReference,
      attendancesSinceReference,
    };

    if (result.degreeEligible) {
      students.push({
        ...base,
        eligibilityType: "degree",
        requiredMonths: row.belt.minMonthsForNextDegree,
        requiredAttendances: row.belt.minAttendancesForNextDegree,
      });
    }

    if (result.beltEligible) {
      students.push({
        ...base,
        eligibilityType: "belt",
        requiredMonths: row.belt.minMonthsForNextBelt,
        requiredAttendances: row.belt.minAttendancesForNextBelt,
      });
    }

    if (result.transitionEligible) {
      students.push({
        ...base,
        eligibilityType: "transition",
        requiredMonths: 0,
        requiredAttendances: 0,
      });
    }
  }

  return {
    students,
    summary: summarizeGraduationEligibility(students),
  };
}

export function summarizeGraduationEligibility(
  students: EligibleStudent[],
): GraduationSummaryResponse {
  return {
    degree: students.filter((student) => student.eligibilityType === "degree").length,
    belt: students.filter((student) => student.eligibilityType === "belt").length,
    transition: students.filter((student) => student.eligibilityType === "transition").length,
  };
}
