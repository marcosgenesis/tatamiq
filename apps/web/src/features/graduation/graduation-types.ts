export type EligibilityType = "degree" | "belt" | "transition";

/** A student surfaced by `/graduation/eligible` as ready for promotion. */
export type EligibleStudent = {
  id: string;
  name: string;
  currentBeltId: string;
  currentBeltName: string;
  currentBeltPath: string;
  currentDegree: number;
  eligibilityType: EligibilityType;
  monthsSinceReference: number;
  attendancesSinceReference: number;
  requiredMonths: number;
  requiredAttendances: number;
};

export type GraduationSummary = { degree: number; belt: number; transition: number };
