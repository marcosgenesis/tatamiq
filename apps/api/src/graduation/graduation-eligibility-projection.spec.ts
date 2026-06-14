import { describe, expect, it } from "vitest";
import { projectGraduationEligibility } from "./graduation-eligibility-projection";

const now = new Date("2026-06-14T12:00:00.000Z");

describe("projectGraduationEligibility", () => {
  it("classifies degree, belt, and transition entries and derives matching summary counts", () => {
    const projection = projectGraduationEligibility(
      [
        {
          student: {
            id: "student-degree",
            name: "Aluno Grau",
            birthDate: "2000-01-10",
            enrollmentDate: "2026-01-01",
            currentDegree: 1,
            degreeEligibilityDismissedUntil: null,
            beltEligibilityDismissedUntil: null,
            transitionDismissedUntil: null,
          },
          belt: {
            id: "belt-adult-1",
            name: "Azul",
            path: "adult",
            maxDegrees: 4,
            minMonthsForNextDegree: 2,
            minAttendancesForNextDegree: 3,
            minMonthsForNextBelt: 24,
            minAttendancesForNextBelt: 40,
          },
          latestPromotionAt: "2026-03-01",
          attendances: [
            { createdAt: new Date("2026-03-10T12:00:00.000Z"), invalidatedAt: null },
            { createdAt: new Date("2026-04-10T12:00:00.000Z"), invalidatedAt: null },
            { createdAt: new Date("2026-05-10T12:00:00.000Z"), invalidatedAt: null },
          ],
        },
        {
          student: {
            id: "student-belt",
            name: "Aluno Faixa",
            birthDate: "1995-05-20",
            enrollmentDate: "2025-01-01",
            currentDegree: 4,
            degreeEligibilityDismissedUntil: null,
            beltEligibilityDismissedUntil: null,
            transitionDismissedUntil: null,
          },
          belt: {
            id: "belt-adult-2",
            name: "Roxa",
            path: "adult",
            maxDegrees: 4,
            minMonthsForNextDegree: 6,
            minAttendancesForNextDegree: 20,
            minMonthsForNextBelt: 6,
            minAttendancesForNextBelt: 6,
          },
          latestPromotionAt: "2025-12-01",
          attendances: Array.from({ length: 6 }, (_, index) => ({
            createdAt: new Date(`2026-0${index + 1}-05T12:00:00.000Z`),
            invalidatedAt: null,
          })),
        },
        {
          student: {
            id: "student-transition",
            name: "Aluno Transição",
            birthDate: "2009-01-01",
            enrollmentDate: "2024-01-01",
            currentDegree: 0,
            degreeEligibilityDismissedUntil: null,
            beltEligibilityDismissedUntil: null,
            transitionDismissedUntil: null,
          },
          belt: {
            id: "belt-child-1",
            name: "Laranja",
            path: "child",
            maxDegrees: 0,
            minMonthsForNextDegree: 0,
            minAttendancesForNextDegree: 0,
            minMonthsForNextBelt: 0,
            minAttendancesForNextBelt: 0,
          },
          latestPromotionAt: null,
          attendances: [],
        },
      ],
      16,
      now,
    );

    expect(projection.students.map((student) => [student.id, student.eligibilityType])).toEqual([
      ["student-degree", "degree"],
      ["student-belt", "belt"],
      ["student-transition", "transition"],
    ]);
    expect(projection.summary).toEqual({ degree: 1, belt: 1, transition: 1 });
  });

  it("excludes dismissed students and invalidated attendances from eligibility", () => {
    const projection = projectGraduationEligibility(
      [
        {
          student: {
            id: "dismissed-degree",
            name: "Aluno Adiado",
            birthDate: "2000-01-10",
            enrollmentDate: "2026-01-01",
            currentDegree: 1,
            degreeEligibilityDismissedUntil: new Date("2026-07-01T00:00:00.000Z"),
            beltEligibilityDismissedUntil: null,
            transitionDismissedUntil: null,
          },
          belt: {
            id: "belt-adult-1",
            name: "Azul",
            path: "adult",
            maxDegrees: 4,
            minMonthsForNextDegree: 2,
            minAttendancesForNextDegree: 2,
            minMonthsForNextBelt: 24,
            minAttendancesForNextBelt: 40,
          },
          latestPromotionAt: "2026-03-01",
          attendances: [
            { createdAt: new Date("2026-03-10T12:00:00.000Z"), invalidatedAt: null },
            { createdAt: new Date("2026-04-10T12:00:00.000Z"), invalidatedAt: null },
          ],
        },
        {
          student: {
            id: "invalidated-attendance",
            name: "Aluno Inválido",
            birthDate: "2000-01-10",
            enrollmentDate: "2026-01-01",
            currentDegree: 1,
            degreeEligibilityDismissedUntil: null,
            beltEligibilityDismissedUntil: null,
            transitionDismissedUntil: null,
          },
          belt: {
            id: "belt-adult-2",
            name: "Azul",
            path: "adult",
            maxDegrees: 4,
            minMonthsForNextDegree: 2,
            minAttendancesForNextDegree: 2,
            minMonthsForNextBelt: 24,
            minAttendancesForNextBelt: 40,
          },
          latestPromotionAt: "2026-03-01",
          attendances: [
            { createdAt: new Date("2026-03-10T12:00:00.000Z"), invalidatedAt: null },
            {
              createdAt: new Date("2026-04-10T12:00:00.000Z"),
              invalidatedAt: new Date("2026-04-11T12:00:00.000Z"),
            },
          ],
        },
      ],
      16,
      now,
    );

    expect(projection.students).toEqual([]);
    expect(projection.summary).toEqual({ degree: 0, belt: 0, transition: 0 });
  });
});
