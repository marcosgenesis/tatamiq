import { eq, inArray } from "drizzle-orm";
import { createDatabase } from "./client";
import {
  attendances,
  belts,
  classCancellations,
  classGroupSchedules,
  classGroups,
  classGroupTags,
  classSessions,
  organization,
  studentClassGroups,
  students,
  user,
} from "./schema";

const db = createDatabase();
type SeedDatabase = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DEV_USER_EMAIL = "dev@tatamiq.local";
const DEV_ORG_SLUG = "academia-de-teste-dev";

const FIXTURE = {
  recurringClassGroupId: "e2e-class-group-recurring",
  recurringScheduleId: "e2e-schedule-recurring-today",
  cancelledClassGroupId: "e2e-class-group-cancelled",
  cancelledScheduleId: "e2e-schedule-cancelled-today",
  cancellationId: "e2e-cancellation-today",
  adHocClassGroupId: "e2e-class-group-ad-hoc",
  adHocSessionId: "e2e-class-session-ad-hoc",
  anaStudentId: "e2e-student-ana-presente",
  brunoStudentId: "e2e-student-bruno-visitante",
  anaLinkId: "e2e-link-ana-recurring",
  recurringTagId: "e2e-tag-recurring",
  cancelledTagId: "e2e-tag-cancelled",
  adHocTagId: "e2e-tag-ad-hoc",
  whiteBeltId: "e2e-belt-adult-white",
  blueBeltId: "e2e-belt-adult-blue",
};

const fixtureClassGroupIds = [
  FIXTURE.recurringClassGroupId,
  FIXTURE.cancelledClassGroupId,
  FIXTURE.adHocClassGroupId,
];
const fixtureStudentIds = [FIXTURE.anaStudentId, FIXTURE.brunoStudentId];
const fixtureScheduleIds = [FIXTURE.recurringScheduleId, FIXTURE.cancelledScheduleId];

const [devUser] = await db
  .select({ id: user.id })
  .from(user)
  .where(eq(user.email, DEV_USER_EMAIL))
  .limit(1);

const [devOrganization] = await db
  .select({ id: organization.id })
  .from(organization)
  .where(eq(organization.slug, DEV_ORG_SLUG))
  .limit(1);

const devUserId = devUser?.id;
const devOrganizationId = devOrganization?.id;

if (!devUserId || !devOrganizationId) {
  console.error(
    "Missing dev user or organization. Run pnpm --filter @tatamiq/database db:seed first.",
  );
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const weekday = weekdayForDate(today);
const now = new Date();

await db.transaction(async (tx) => {
  await resetFixture(tx);
  await createFixture(tx, devOrganizationId, devUserId);
});

console.log(`Seeded E2E attendance fixture for ${today}`);
process.exit(0);

async function resetFixture(database: SeedDatabase) {
  const existingFixtureSessions = await database
    .select({ id: classSessions.id })
    .from(classSessions)
    .where(inArray(classSessions.classGroupId, fixtureClassGroupIds));
  const existingFixtureSessionIds = existingFixtureSessions.map((session) => session.id);

  if (existingFixtureSessionIds.length > 0) {
    await database
      .delete(attendances)
      .where(inArray(attendances.classSessionId, existingFixtureSessionIds));
  }

  await database.delete(attendances).where(inArray(attendances.studentId, fixtureStudentIds));
  await database
    .delete(classSessions)
    .where(inArray(classSessions.classGroupId, fixtureClassGroupIds));
  await database
    .delete(classCancellations)
    .where(inArray(classCancellations.classGroupId, fixtureClassGroupIds));
  await database
    .delete(studentClassGroups)
    .where(inArray(studentClassGroups.studentId, fixtureStudentIds));
  await database
    .delete(classGroupTags)
    .where(inArray(classGroupTags.classGroupId, fixtureClassGroupIds));
  await database
    .delete(classGroupSchedules)
    .where(inArray(classGroupSchedules.id, fixtureScheduleIds));
  await database.delete(classGroups).where(inArray(classGroups.id, fixtureClassGroupIds));
  await database.delete(students).where(inArray(students.id, fixtureStudentIds));
  await database.delete(belts).where(inArray(belts.id, [FIXTURE.whiteBeltId, FIXTURE.blueBeltId]));
}

async function createFixture(database: SeedDatabase, organizationId: string, userId: string) {
  await database.insert(belts).values([
    {
      id: FIXTURE.whiteBeltId,
      organizationId,
      name: "Branca",
      slug: "adult-white",
      path: "adult",
      position: 0,
      maxDegrees: 4,
      minMonthsForNextDegree: 6,
      minAttendancesForNextDegree: 30,
      minMonthsForNextBelt: 24,
      minAttendancesForNextBelt: 120,
    },
    {
      id: FIXTURE.blueBeltId,
      organizationId,
      name: "Azul",
      slug: "adult-blue",
      path: "adult",
      position: 1,
      maxDegrees: 4,
      minMonthsForNextDegree: 6,
      minAttendancesForNextDegree: 30,
      minMonthsForNextBelt: 24,
      minAttendancesForNextBelt: 120,
    },
  ]);

  await database.insert(students).values([
    {
      id: FIXTURE.anaStudentId,
      organizationId: organizationId,
      name: "E2E Ana Presente",
      birthDate: "1998-03-12",
      enrollmentDate: "2024-01-10",
      status: "active",
      inactiveAt: null,
      phone: null,
      email: "ana.e2e@tatamiq.local",
      monthlyAmountInCents: 25000,
      monthlyDueDay: 10,
      currentBeltId: FIXTURE.whiteBeltId,
      currentDegree: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: FIXTURE.brunoStudentId,
      organizationId: organizationId,
      name: "E2E Bruno Visitante",
      birthDate: "1995-08-22",
      enrollmentDate: "2024-02-15",
      status: "active",
      inactiveAt: null,
      phone: null,
      email: "bruno.e2e@tatamiq.local",
      monthlyAmountInCents: 25000,
      monthlyDueDay: 10,
      currentBeltId: FIXTURE.blueBeltId,
      currentDegree: 0,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await database.insert(classGroups).values([
    {
      id: FIXTURE.recurringClassGroupId,
      organizationId: organizationId,
      name: "E2E No-Gi 19h",
      defaultDurationMinutes: 60,
      status: "active",
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: FIXTURE.cancelledClassGroupId,
      organizationId: organizationId,
      name: "E2E Aula Cancelada",
      defaultDurationMinutes: 60,
      status: "active",
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: FIXTURE.adHocClassGroupId,
      organizationId: organizationId,
      name: "E2E Open Mat Avulsa",
      defaultDurationMinutes: 45,
      status: "active",
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await database.insert(classGroupSchedules).values([
    {
      id: FIXTURE.recurringScheduleId,
      organizationId: organizationId,
      classGroupId: FIXTURE.recurringClassGroupId,
      weekday,
      startTime: "19:00",
      createdAt: now,
    },
    {
      id: FIXTURE.cancelledScheduleId,
      organizationId: organizationId,
      classGroupId: FIXTURE.cancelledClassGroupId,
      weekday,
      startTime: "20:00",
      createdAt: now,
    },
  ]);

  await database.insert(classGroupTags).values([
    {
      id: FIXTURE.recurringTagId,
      organizationId: organizationId,
      classGroupId: FIXTURE.recurringClassGroupId,
      label: "e2e",
    },
    {
      id: FIXTURE.cancelledTagId,
      organizationId: organizationId,
      classGroupId: FIXTURE.cancelledClassGroupId,
      label: "e2e",
    },
    {
      id: FIXTURE.adHocTagId,
      organizationId: organizationId,
      classGroupId: FIXTURE.adHocClassGroupId,
      label: "e2e",
    },
  ]);

  await database.insert(studentClassGroups).values({
    id: FIXTURE.anaLinkId,
    organizationId: organizationId,
    studentId: FIXTURE.anaStudentId,
    classGroupId: FIXTURE.recurringClassGroupId,
    activeFrom: "2024-01-10",
    activeUntil: null,
    createdAt: now,
  });

  await database.insert(classCancellations).values({
    id: FIXTURE.cancellationId,
    organizationId: organizationId,
    classGroupId: FIXTURE.cancelledClassGroupId,
    classGroupScheduleId: FIXTURE.cancelledScheduleId,
    occurrenceDate: today,
    createdByUserId: userId,
    cancelledAt: now,
    revertedAt: null,
    revertedByUserId: null,
  });

  await database.insert(classSessions).values({
    id: FIXTURE.adHocSessionId,
    organizationId: organizationId,
    classGroupId: FIXTURE.adHocClassGroupId,
    kind: "ad_hoc",
    scheduledStartAt: scheduledStartAt(today, "21:00"),
    actualStartAt: null,
    durationMinutes: 45,
    endedAt: null,
    status: "scheduled",
    cancelledAt: null,
    cancelledByUserId: null,
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
  });
}

function weekdayForDate(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

function scheduledStartAt(date: string, startTime: string): Date {
  return new Date(`${date}T${startTime}:00.000Z`);
}
