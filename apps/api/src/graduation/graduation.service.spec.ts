import { describe, expect, it, vi } from "vitest";
import { GraduationService } from "./graduation.service";

type QueryPromise<T> = Promise<T> & {
  from: () => QueryPromise<T>;
  innerJoin: () => QueryPromise<T>;
  where: () => QueryPromise<T>;
  orderBy: () => QueryPromise<T>;
  limit: () => Promise<T>;
};

function createQueryPromise<T>(result: T): QueryPromise<T> {
  const promise = Promise.resolve(result) as QueryPromise<T>;
  promise.from = () => promise;
  promise.innerJoin = () => promise;
  promise.where = () => promise;
  promise.orderBy = () => promise;
  promise.limit = () => Promise.resolve(result);
  return promise;
}

function createSelectSequence(results: unknown[]) {
  let index = 0;
  return vi.fn(() => createQueryPromise(results[index++]));
}

describe("GraduationService eligibility projection", () => {
  it("loads eligibility data through a bounded number of set-based reads", async () => {
    const db = {
      select: createSelectSequence([
        [{ childToAdultAge: 16 }],
        [
          {
            student: {
              id: "student-1",
              name: "Aluno 1",
              birthDate: "2000-01-01",
              enrollmentDate: "2026-01-01",
              currentDegree: 1,
              degreeEligibilityDismissedUntil: null,
              beltEligibilityDismissedUntil: null,
              transitionDismissedUntil: null,
              organizationId: "academy-1",
              status: "active",
            },
            belt: {
              id: "belt-1",
              name: "Azul",
              path: "adult",
              maxDegrees: 4,
              minMonthsForNextDegree: 2,
              minAttendancesForNextDegree: 2,
              minMonthsForNextBelt: 24,
              minAttendancesForNextBelt: 40,
            },
          },
          {
            student: {
              id: "student-2",
              name: "Aluno 2",
              birthDate: "2009-01-01",
              enrollmentDate: "2025-01-01",
              currentDegree: 0,
              degreeEligibilityDismissedUntil: null,
              beltEligibilityDismissedUntil: null,
              transitionDismissedUntil: null,
              organizationId: "academy-1",
              status: "active",
            },
            belt: {
              id: "belt-2",
              name: "Laranja",
              path: "child",
              maxDegrees: 0,
              minMonthsForNextDegree: 0,
              minAttendancesForNextDegree: 0,
              minMonthsForNextBelt: 0,
              minAttendancesForNextBelt: 0,
            },
          },
        ],
        [{ studentId: "student-1", promotedAt: "2026-03-01" }],
        [
          {
            studentId: "student-1",
            createdAt: new Date("2026-03-10T12:00:00.000Z"),
            invalidatedAt: null,
          },
          {
            studentId: "student-1",
            createdAt: new Date("2026-04-10T12:00:00.000Z"),
            invalidatedAt: null,
          },
        ],
      ]),
    };

    const service = new GraduationService(db as never);
    const result = await service.listEligibleStudents("academy-1");

    expect(result.summary).toEqual({ degree: 1, belt: 0, transition: 1 });
    expect(result.students).toHaveLength(2);
    expect(db.select).toHaveBeenCalledTimes(4);
  });

  it("returns filtered students while preserving summary counts from the same projection", async () => {
    const db = {
      select: createSelectSequence([
        [{ childToAdultAge: 16 }],
        [
          {
            student: {
              id: "student-1",
              name: "Aluno 1",
              birthDate: "2000-01-01",
              enrollmentDate: "2026-01-01",
              currentDegree: 1,
              degreeEligibilityDismissedUntil: null,
              beltEligibilityDismissedUntil: null,
              transitionDismissedUntil: null,
              organizationId: "academy-1",
              status: "active",
            },
            belt: {
              id: "belt-1",
              name: "Azul",
              path: "adult",
              maxDegrees: 4,
              minMonthsForNextDegree: 2,
              minAttendancesForNextDegree: 2,
              minMonthsForNextBelt: 24,
              minAttendancesForNextBelt: 40,
            },
          },
          {
            student: {
              id: "student-2",
              name: "Aluno 2",
              birthDate: "2009-01-01",
              enrollmentDate: "2025-01-01",
              currentDegree: 0,
              degreeEligibilityDismissedUntil: null,
              beltEligibilityDismissedUntil: null,
              transitionDismissedUntil: null,
              organizationId: "academy-1",
              status: "active",
            },
            belt: {
              id: "belt-2",
              name: "Laranja",
              path: "child",
              maxDegrees: 0,
              minMonthsForNextDegree: 0,
              minAttendancesForNextDegree: 0,
              minMonthsForNextBelt: 0,
              minAttendancesForNextBelt: 0,
            },
          },
        ],
        [{ studentId: "student-1", promotedAt: "2026-03-01" }],
        [
          {
            studentId: "student-1",
            createdAt: new Date("2026-03-10T12:00:00.000Z"),
            invalidatedAt: null,
          },
          {
            studentId: "student-1",
            createdAt: new Date("2026-04-10T12:00:00.000Z"),
            invalidatedAt: null,
          },
        ],
      ]),
    };

    const service = new GraduationService(db as never);
    const result = await service.listEligibleStudents("academy-1", "degree");

    expect(result.students).toHaveLength(1);
    expect(result.students[0]?.eligibilityType).toBe("degree");
    expect(result.summary).toEqual({ degree: 1, belt: 0, transition: 1 });
  });
});
