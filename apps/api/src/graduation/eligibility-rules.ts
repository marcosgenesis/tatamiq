type BeltRules = {
  maxDegrees: number;
  minMonthsForNextDegree: number;
  minAttendancesForNextDegree: number;
  minMonthsForNextBelt: number;
  minAttendancesForNextBelt: number;
  path: "adult" | "child";
};

type StudentState = {
  currentDegree: number;
  monthsSinceReference: number;
  attendancesSinceReference: number;
  age: number;
  childToAdultAge: number;
  degreeEligibilityDismissedUntil: Date | null;
  beltEligibilityDismissedUntil: Date | null;
  transitionDismissedUntil: Date | null;
};

export type EligibilityResult = {
  degreeEligible: boolean;
  beltEligible: boolean;
  transitionEligible: boolean;
};

function isDismissed(dismissedUntil: Date | null, now: Date): boolean {
  return dismissedUntil !== null && dismissedUntil > now;
}

export function calculateEligibility(
  belt: BeltRules,
  student: StudentState,
  now: Date = new Date(),
): EligibilityResult {
  const degreeEligible =
    student.currentDegree < belt.maxDegrees &&
    belt.maxDegrees > 0 &&
    student.monthsSinceReference >= belt.minMonthsForNextDegree &&
    student.attendancesSinceReference >= belt.minAttendancesForNextDegree &&
    !isDismissed(student.degreeEligibilityDismissedUntil, now);

  const beltEligible =
    belt.minMonthsForNextBelt > 0 &&
    student.monthsSinceReference >= belt.minMonthsForNextBelt &&
    student.attendancesSinceReference >= belt.minAttendancesForNextBelt &&
    !isDismissed(student.beltEligibilityDismissedUntil, now);

  const transitionEligible =
    belt.path === "child" &&
    student.age >= student.childToAdultAge &&
    !isDismissed(student.transitionDismissedUntil, now);

  return { degreeEligible, beltEligible, transitionEligible };
}

export function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

export function calculateAge(birthDate: Date, referenceDate: Date): number {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
