import { eq, inArray, sql } from "drizzle-orm";
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
  studentGuardians,
  students,
  user,
} from "./schema";

const db = createDatabase();
type SeedDatabase = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DEV_USER_EMAIL = "dev@tatamiq.local";
const DEV_ORG_SLUG = "academia-de-teste-dev";

/**
 * E2E fixture conventions:
 * - keep ids stable and prefixed with `e2e-` so reset logic can target only test data
 * - make each domain slice extend this map instead of inventing ad hoc ids in specs
 * - keep reseeding idempotent: reset first, then recreate the same records every run
 */
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
  crudFixtureStudentId: "e2e-student-crud-fixture",
  anaLinkId: "e2e-link-ana-recurring",
  recurringTagId: "e2e-tag-recurring",
  cancelledTagId: "e2e-tag-cancelled",
  adHocTagId: "e2e-tag-ad-hoc",
  whiteBeltId: "e2e-belt-adult-white",
  blueBeltId: "e2e-belt-adult-blue",
  childGreyBeltId: "e2e-belt-child-grey",
};

const fixtureClassGroupIds = [
  FIXTURE.recurringClassGroupId,
  FIXTURE.cancelledClassGroupId,
  FIXTURE.adHocClassGroupId,
];
const fixtureStudentIds = [
  FIXTURE.anaStudentId,
  FIXTURE.brunoStudentId,
  FIXTURE.crudFixtureStudentId,
];
const fixtureScheduleIds = [FIXTURE.recurringScheduleId, FIXTURE.cancelledScheduleId];
const fixtureBeltIds = [FIXTURE.whiteBeltId, FIXTURE.blueBeltId, FIXTURE.childGreyBeltId];
const createdStudentEmails = ["adult.crud.e2e@tatamiq.local", "minor.crud.e2e@tatamiq.local"];

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
  const dynamicCreatedStudents = await database
    .select({ id: students.id })
    .from(students)
    .where(sql`
      ${students.email} in (${sql.join(
        createdStudentEmails.map((email) => sql`${email}`),
        sql`, `,
      )})
      or ${students.name} like '000 E2E Adulto %'
      or ${students.name} like '000 E2E Menor %'
      or ${students.name} = '000 E2E Adulto CRUD'
      or ${students.name} = '000 E2E Menor CRUD'
    `);
  const dynamicCreatedStudentIds = dynamicCreatedStudents.map((student) => student.id);

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
  const studentIdsToDelete = [...fixtureStudentIds, ...dynamicCreatedStudentIds];

  if (studentIdsToDelete.length > 0) {
    await database
      .delete(studentGuardians)
      .where(inArray(studentGuardians.studentId, studentIdsToDelete));
    await database.delete(students).where(inArray(students.id, studentIdsToDelete));
  }
  await database.delete(belts).where(inArray(belts.id, fixtureBeltIds));
}

async function createFixture(database: SeedDatabase, organizationId: string, userId: string) {
  await database.insert(belts).values([
    {
      id: FIXTURE.whiteBeltId,
      organizationId,
      name: "Branca",
      slug: "e2e-adult-white",
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
      slug: "e2e-adult-blue",
      path: "adult",
      position: 1,
      maxDegrees: 4,
      minMonthsForNextDegree: 6,
      minAttendancesForNextDegree: 30,
      minMonthsForNextBelt: 24,
      minAttendancesForNextBelt: 120,
    },
    {
      id: FIXTURE.childGreyBeltId,
      organizationId,
      name: "Cinza",
      slug: "e2e-child-grey",
      path: "child",
      position: 0,
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
      organizationId,
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
      organizationId,
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
    {
      id: FIXTURE.crudFixtureStudentId,
      organizationId,
      name: "000 E2E Carla CRUD",
      birthDate: "2007-04-20",
      enrollmentDate: "2024-03-05",
      status: "active",
      inactiveAt: null,
      phone: null,
      email: "carla.crud.e2e@tatamiq.local",
      monthlyAmountInCents: 23000,
      monthlyDueDay: 15,
      currentBeltId: FIXTURE.childGreyBeltId,
      currentDegree: 2,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await database.insert(studentGuardians).values({
    id: "e2e-guardian-crud-fixture",
    studentId: FIXTURE.crudFixtureStudentId,
    name: "E2E Guardiã Carla",
    phone: "11988887777",
    email: "guardia.carla.e2e@tatamiq.local",
    relationship: "Mãe",
    createdAt: now,
    updatedAt: now,
  });

  await database.insert(classGroups).values([
    {
      id: FIXTURE.recurringClassGroupId,
      organizationId,
      name: "E2E No-Gi 19h",
      defaultDurationMinutes: 60,
      status: "active",
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: FIXTURE.cancelledClassGroupId,
      organizationId,
      name: "E2E Aula Cancelada",
      defaultDurationMinutes: 60,
      status: "active",
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: FIXTURE.adHocClassGroupId,
      organizationId,
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
      organizationId,
      classGroupId: FIXTURE.recurringClassGroupId,
      weekday,
      startTime: "19:00",
      createdAt: now,
    },
    {
      id: FIXTURE.cancelledScheduleId,
      organizationId,
      classGroupId: FIXTURE.cancelledClassGroupId,
      weekday,
      startTime: "20:00",
      createdAt: now,
    },
  ]);

  await database.insert(classGroupTags).values([
    {
      id: FIXTURE.recurringTagId,
      organizationId,
      classGroupId: FIXTURE.recurringClassGroupId,
      label: "e2e",
    },
    {
      id: FIXTURE.cancelledTagId,
      organizationId,
      classGroupId: FIXTURE.cancelledClassGroupId,
      label: "e2e",
    },
    {
      id: FIXTURE.adHocTagId,
      organizationId,
      classGroupId: FIXTURE.adHocClassGroupId,
      label: "e2e",
    },
  ]);

  await database.insert(studentClassGroups).values({
    id: FIXTURE.anaLinkId,
    organizationId,
    studentId: FIXTURE.anaStudentId,
    classGroupId: FIXTURE.recurringClassGroupId,
    activeFrom: "2024-01-10",
    activeUntil: null,
    createdAt: now,
  });

  await database.insert(classCancellations).values({
    id: FIXTURE.cancellationId,
    organizationId,
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
    organizationId,
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
