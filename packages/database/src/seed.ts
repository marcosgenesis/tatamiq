import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { createDatabase } from "./client";
import {
  account,
  attendances,
  belts,
  classCancellations,
  classGroupSchedules,
  classGroups,
  classGroupTags,
  classSessions,
  member,
  monthlyFeeEvents,
  monthlyFees,
  organization,
  promotions,
  studentClassGroups,
  studentGuardians,
  studentNotes,
  students,
  user,
} from "./schema";

const forceReseed = process.argv.includes("--force");

const db = createDatabase();

const email = "dev@tatamiq.local";
const password = "tatamiq123";
const academyName = "Legado Jiu Jitsu";
const academySlug = "academia-de-teste-dev";

const now = new Date();
const today = now.toISOString().slice(0, 10);
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

function daysAgo(n: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthsAgo(n: number): Date {
  const d = new Date(now);
  d.setMonth(d.getMonth() - n);
  return d;
}

function scheduledStartAt(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000-03:00`);
}

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00.000Z`).getUTCDay();
}

// --- Auth user & org ---

const [existingUser] = await db
  .select({ id: user.id })
  .from(user)
  .where(eq(user.email, email))
  .limit(1);

const userId = existingUser?.id ?? randomUUID();

if (!existingUser) {
  await db.insert(user).values({
    id: userId,
    name: "Instrutor Dev",
    email,
    emailVerified: true,
  });

  await db.insert(account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(password),
  });
}

const [existingOrganization] = await db
  .select({ id: organization.id })
  .from(organization)
  .where(eq(organization.slug, academySlug))
  .limit(1);

const organizationId = existingOrganization?.id ?? randomUUID();

if (!existingOrganization) {
  await db.insert(organization).values({
    id: organizationId,
    name: academyName,
    slug: academySlug,
    phone: "(85) 99999-0000",
    instagram: "@legadojiujitsu",
    pixKeyType: "phone",
    pixKey: "(85) 99999-0000",
    childToAdultAge: 16,
  });
}

const [existingMember] = await db
  .select({ id: member.id })
  .from(member)
  .where(eq(member.userId, userId))
  .limit(1);

if (!existingMember) {
  await db.insert(member).values({
    id: randomUUID(),
    organizationId,
    userId,
    role: "owner",
  });
}

// --- Check if seed data already exists ---

const [existingBelt] = await db
  .select({ id: belts.id })
  .from(belts)
  .where(eq(belts.organizationId, organizationId))
  .limit(1);

if (existingBelt && !forceReseed) {
  console.log(`Seed data already exists for ${academyName}, skipping. Use --force to re-seed.`);
  console.log(`Login: ${email} / ${password}`);
  process.exit(0);
}

if (existingBelt && forceReseed) {
  console.log("--force: cleaning existing seed data...");
  await db.delete(attendances).where(eq(attendances.organizationId, organizationId));
  await db.delete(classCancellations).where(eq(classCancellations.organizationId, organizationId));
  await db.delete(classSessions).where(eq(classSessions.organizationId, organizationId));
  await db.delete(studentClassGroups).where(eq(studentClassGroups.organizationId, organizationId));
  await db.delete(classGroupTags).where(eq(classGroupTags.organizationId, organizationId));
  await db
    .delete(classGroupSchedules)
    .where(eq(classGroupSchedules.organizationId, organizationId));
  await db.delete(classGroups).where(eq(classGroups.organizationId, organizationId));
  await db.delete(monthlyFeeEvents).where(eq(monthlyFeeEvents.organizationId, organizationId));
  await db.delete(monthlyFees).where(eq(monthlyFees.organizationId, organizationId));
  await db.delete(promotions).where(eq(promotions.organizationId, organizationId));
  await db.delete(studentNotes).where(eq(studentNotes.organizationId, organizationId));
  await db
    .delete(studentGuardians)
    .where(sql`student_id IN (SELECT id FROM students WHERE organization_id = ${organizationId})`);
  await db.delete(students).where(eq(students.organizationId, organizationId));
  await db.delete(belts).where(eq(belts.organizationId, organizationId));
  console.log("Existing data cleaned.");
}

// --- Belts (adult path) ---

const beltData = [
  {
    id: randomUUID(),
    slug: "adult-white",
    name: "Branca",
    position: 0,
    maxDegrees: 4,
    minMonthsDegree: 6,
    minAttDegree: 30,
    minMonthsBelt: 24,
    minAttBelt: 120,
  },
  {
    id: randomUUID(),
    slug: "adult-blue",
    name: "Azul",
    position: 1,
    maxDegrees: 4,
    minMonthsDegree: 8,
    minAttDegree: 40,
    minMonthsBelt: 24,
    minAttBelt: 150,
  },
  {
    id: randomUUID(),
    slug: "adult-purple",
    name: "Roxa",
    position: 2,
    maxDegrees: 4,
    minMonthsDegree: 10,
    minAttDegree: 50,
    minMonthsBelt: 30,
    minAttBelt: 200,
  },
  {
    id: randomUUID(),
    slug: "adult-brown",
    name: "Marrom",
    position: 3,
    maxDegrees: 4,
    minMonthsDegree: 12,
    minAttDegree: 60,
    minMonthsBelt: 36,
    minAttBelt: 250,
  },
  {
    id: randomUUID(),
    slug: "adult-black",
    name: "Preta",
    position: 4,
    maxDegrees: 6,
    minMonthsDegree: 36,
    minAttDegree: 100,
    minMonthsBelt: 0,
    minAttBelt: 0,
  },
];

const beltChildData = [
  {
    id: randomUUID(),
    slug: "child-white",
    name: "Branca",
    position: 0,
    maxDegrees: 4,
    minMonthsDegree: 4,
    minAttDegree: 20,
    minMonthsBelt: 12,
    minAttBelt: 60,
  },
  {
    id: randomUUID(),
    slug: "child-grey",
    name: "Cinza",
    position: 1,
    maxDegrees: 4,
    minMonthsDegree: 4,
    minAttDegree: 20,
    minMonthsBelt: 12,
    minAttBelt: 60,
  },
  {
    id: randomUUID(),
    slug: "child-yellow",
    name: "Amarela",
    position: 2,
    maxDegrees: 4,
    minMonthsDegree: 4,
    minAttDegree: 20,
    minMonthsBelt: 12,
    minAttBelt: 60,
  },
  {
    id: randomUUID(),
    slug: "child-orange",
    name: "Laranja",
    position: 3,
    maxDegrees: 4,
    minMonthsDegree: 4,
    minAttDegree: 20,
    minMonthsBelt: 12,
    minAttBelt: 60,
  },
  {
    id: randomUUID(),
    slug: "child-green",
    name: "Verde",
    position: 4,
    maxDegrees: 4,
    minMonthsDegree: 4,
    minAttDegree: 20,
    minMonthsBelt: 12,
    minAttBelt: 60,
  },
];

await db.insert(belts).values(
  [...beltData, ...beltChildData].map((b) => ({
    id: b.id,
    organizationId,
    name: b.name,
    slug: b.slug,
    path: b.slug.startsWith("child") ? "child" : "adult",
    position: b.position,
    maxDegrees: b.maxDegrees,
    minMonthsForNextDegree: b.minMonthsDegree,
    minAttendancesForNextDegree: b.minAttDegree,
    minMonthsForNextBelt: b.minMonthsBelt,
    minAttendancesForNextBelt: b.minAttBelt,
  })),
);

const whiteBelt = beltData[0];
const blueBelt = beltData[1];
const purpleBelt = beltData[2];
const brownBelt = beltData[3];
const childWhiteBelt = beltChildData[0];
const childGreyBelt = beltChildData[1];

// --- Students ---

const studentList = [
  {
    id: randomUUID(),
    name: "Lucas Oliveira",
    birth: "1995-03-15",
    enrolled: dateStr(monthsAgo(18)),
    belt: whiteBelt,
    degree: 3,
    phone: "(85) 98888-1001",
    email: "lucas@email.com",
    amount: 18000,
    dueDay: 10,
    status: "active" as const,
  },
  {
    id: randomUUID(),
    name: "Mariana Silva",
    birth: "1998-07-22",
    enrolled: dateStr(monthsAgo(14)),
    belt: whiteBelt,
    degree: 2,
    phone: "(85) 98888-1002",
    email: "mariana@email.com",
    amount: 18000,
    dueDay: 10,
    status: "active" as const,
  },
  {
    id: randomUUID(),
    name: "Pedro Santos",
    birth: "1992-11-08",
    enrolled: dateStr(monthsAgo(30)),
    belt: blueBelt,
    degree: 2,
    phone: "(85) 98888-1003",
    email: "pedro@email.com",
    amount: 20000,
    dueDay: 5,
    status: "active" as const,
  },
  {
    id: randomUUID(),
    name: "Camila Ferreira",
    birth: "2000-01-30",
    enrolled: dateStr(monthsAgo(10)),
    belt: whiteBelt,
    degree: 1,
    phone: "(85) 98888-1004",
    email: "camila@email.com",
    amount: 18000,
    dueDay: 15,
    status: "active" as const,
  },
  {
    id: randomUUID(),
    name: "Rafael Costa",
    birth: "1988-05-12",
    enrolled: dateStr(monthsAgo(48)),
    belt: purpleBelt,
    degree: 1,
    phone: "(85) 98888-1005",
    email: "rafael@email.com",
    amount: 22000,
    dueDay: 10,
    status: "active" as const,
  },
  {
    id: randomUUID(),
    name: "Ana Beatriz Lima",
    birth: "1997-09-03",
    enrolled: dateStr(monthsAgo(24)),
    belt: blueBelt,
    degree: 0,
    phone: "(85) 98888-1006",
    email: "anab@email.com",
    amount: 20000,
    dueDay: 10,
    status: "active" as const,
  },
  {
    id: randomUUID(),
    name: "Felipe Almeida",
    birth: "1990-12-18",
    enrolled: dateStr(monthsAgo(36)),
    belt: brownBelt,
    degree: 0,
    phone: "(85) 98888-1007",
    email: "felipe@email.com",
    amount: 25000,
    dueDay: 5,
    status: "active" as const,
  },
  {
    id: randomUUID(),
    name: "Juliana Rocha",
    birth: "2001-04-25",
    enrolled: dateStr(monthsAgo(8)),
    belt: whiteBelt,
    degree: 0,
    phone: "(85) 98888-1008",
    email: "juliana@email.com",
    amount: 18000,
    dueDay: 20,
    status: "active" as const,
  },
  {
    id: randomUUID(),
    name: "Thiago Mendes",
    birth: "1993-06-14",
    enrolled: dateStr(monthsAgo(20)),
    belt: blueBelt,
    degree: 1,
    phone: "(85) 98888-1009",
    email: "thiago@email.com",
    amount: 20000,
    dueDay: 10,
    status: "active" as const,
  },
  {
    id: randomUUID(),
    name: "Gabriela Nunes",
    birth: "1999-02-07",
    enrolled: dateStr(monthsAgo(6)),
    belt: whiteBelt,
    degree: 0,
    phone: "(85) 98888-1010",
    email: "gabriela@email.com",
    amount: 18000,
    dueDay: 10,
    status: "active" as const,
  },
  {
    id: randomUUID(),
    name: "Bruno Carvalho",
    birth: "1996-10-20",
    enrolled: dateStr(monthsAgo(16)),
    belt: whiteBelt,
    degree: 2,
    phone: "(85) 98888-1011",
    email: "bruno@email.com",
    amount: 18000,
    dueDay: 15,
    status: "active" as const,
  },
  {
    id: randomUUID(),
    name: "Isabela Martins",
    birth: "2002-08-11",
    enrolled: dateStr(monthsAgo(4)),
    belt: whiteBelt,
    degree: 0,
    phone: "(85) 98888-1012",
    email: "isabela@email.com",
    amount: 15000,
    dueDay: 10,
    status: "active" as const,
  },
  // Inactive students
  {
    id: randomUUID(),
    name: "Diego Barbosa",
    birth: "1991-01-05",
    enrolled: dateStr(monthsAgo(12)),
    belt: whiteBelt,
    degree: 1,
    phone: "(85) 98888-1013",
    email: "diego@email.com",
    amount: 18000,
    dueDay: 10,
    status: "inactive" as const,
  },
  {
    id: randomUUID(),
    name: "Fernanda Gomes",
    birth: "1994-11-28",
    enrolled: dateStr(monthsAgo(9)),
    belt: whiteBelt,
    degree: 0,
    phone: "(85) 98888-1014",
    email: "fernanda@email.com",
    amount: 18000,
    dueDay: 5,
    status: "inactive" as const,
  },
  // Child students
  {
    id: randomUUID(),
    name: "Miguel Souza",
    birth: "2014-03-10",
    enrolled: dateStr(monthsAgo(12)),
    belt: childGreyBelt,
    degree: 1,
    phone: "(85) 98888-1015",
    email: null,
    amount: 12000,
    dueDay: 10,
    status: "active" as const,
  },
  {
    id: randomUUID(),
    name: "Sofia Pereira",
    birth: "2015-06-22",
    enrolled: dateStr(monthsAgo(8)),
    belt: childWhiteBelt,
    degree: 2,
    phone: "(85) 98888-1016",
    email: null,
    amount: 12000,
    dueDay: 10,
    status: "active" as const,
  },
];

await db.insert(students).values(
  studentList.map((s) => ({
    id: s.id,
    organizationId,
    name: s.name,
    birthDate: s.birth,
    enrollmentDate: s.enrolled,
    status: s.status,
    inactiveAt: s.status === "inactive" ? daysAgo(30) : null,
    phone: s.phone,
    email: s.email,
    monthlyAmountInCents: s.amount,
    monthlyDueDay: s.dueDay,
    currentBeltId: s.belt.id,
    currentDegree: s.degree,
    createdAt: now,
    updatedAt: now,
  })),
);

// --- Guardians (for child students) ---

await db.insert(studentGuardians).values([
  {
    id: randomUUID(),
    studentId: studentList[14].id,
    name: "Carlos Souza",
    phone: "(85) 98888-2001",
    email: "carlos.souza@email.com",
    relationship: "Pai",
  },
  {
    id: randomUUID(),
    studentId: studentList[15].id,
    name: "Maria Pereira",
    phone: "(85) 98888-2002",
    email: "maria.pereira@email.com",
    relationship: "Mãe",
  },
]);

// --- Class Groups ---

const classGroupList = [
  {
    id: randomUUID(),
    name: "Fundamentos - Manhã",
    duration: 60,
    status: "active" as const,
    tag: "Iniciante",
  },
  {
    id: randomUUID(),
    name: "No-Gi - Noite",
    duration: 60,
    status: "active" as const,
    tag: "No-Gi",
  },
  { id: randomUUID(), name: "Avançado", duration: 75, status: "active" as const, tag: "Avançado" },
  { id: randomUUID(), name: "Kids", duration: 45, status: "active" as const, tag: "Infantil" },
  { id: randomUUID(), name: "Open Mat", duration: 90, status: "active" as const, tag: "Livre" },
  {
    id: randomUUID(),
    name: "Competição (arquivada)",
    duration: 90,
    status: "archived" as const,
    tag: "Competição",
  },
];

await db.insert(classGroups).values(
  classGroupList.map((cg) => ({
    id: cg.id,
    organizationId,
    name: cg.name,
    defaultDurationMinutes: cg.duration,
    status: cg.status,
    archivedAt: cg.status === "archived" ? daysAgo(60) : null,
    createdAt: now,
    updatedAt: now,
  })),
);

await db.insert(classGroupTags).values(
  classGroupList.map((cg) => ({
    id: randomUUID(),
    organizationId,
    classGroupId: cg.id,
    label: cg.tag,
  })),
);

// --- Class Group Schedules (weekday: 0=Sun, 1=Mon...) ---

const scheduleList = [
  // Fundamentos Manhã: Mon/Wed/Fri 07:00
  { id: randomUUID(), groupId: classGroupList[0].id, weekday: 1, time: "07:00" },
  { id: randomUUID(), groupId: classGroupList[0].id, weekday: 3, time: "07:00" },
  { id: randomUUID(), groupId: classGroupList[0].id, weekday: 5, time: "07:00" },
  // No-Gi Noite: Mon/Wed/Fri 19:00
  { id: randomUUID(), groupId: classGroupList[1].id, weekday: 1, time: "19:00" },
  { id: randomUUID(), groupId: classGroupList[1].id, weekday: 3, time: "19:00" },
  { id: randomUUID(), groupId: classGroupList[1].id, weekday: 5, time: "19:00" },
  // Avançado: Tue/Thu 19:00
  { id: randomUUID(), groupId: classGroupList[2].id, weekday: 2, time: "19:00" },
  { id: randomUUID(), groupId: classGroupList[2].id, weekday: 4, time: "19:00" },
  // Kids: Tue/Thu 17:00
  { id: randomUUID(), groupId: classGroupList[3].id, weekday: 2, time: "17:00" },
  { id: randomUUID(), groupId: classGroupList[3].id, weekday: 4, time: "17:00" },
  // Open Mat: Sat 10:00
  { id: randomUUID(), groupId: classGroupList[4].id, weekday: 6, time: "10:00" },
];

await db.insert(classGroupSchedules).values(
  scheduleList.map((s) => ({
    id: s.id,
    organizationId,
    classGroupId: s.groupId,
    weekday: s.weekday,
    startTime: s.time,
    createdAt: now,
  })),
);

// --- Student <> Class Group enrollments ---

const activeStudents = studentList.filter((s) => s.status === "active");
const adultActive = activeStudents.filter((s) => !s.belt.slug.startsWith("child"));
const childActive = activeStudents.filter((s) => s.belt.slug.startsWith("child"));

const enrollments: { id: string; studentId: string; classGroupId: string; from: string }[] = [];

for (const s of adultActive) {
  // Beginners go to Fundamentos
  if ([whiteBelt.slug].includes(s.belt.slug)) {
    enrollments.push({
      id: randomUUID(),
      studentId: s.id,
      classGroupId: classGroupList[0].id,
      from: s.enrolled,
    });
  }
  // Blue+ go to Avançado
  if ([blueBelt.slug, purpleBelt.slug, brownBelt.slug].includes(s.belt.slug)) {
    enrollments.push({
      id: randomUUID(),
      studentId: s.id,
      classGroupId: classGroupList[2].id,
      from: s.enrolled,
    });
  }
  // Everyone in No-Gi
  enrollments.push({
    id: randomUUID(),
    studentId: s.id,
    classGroupId: classGroupList[1].id,
    from: s.enrolled,
  });
}

for (const s of childActive) {
  enrollments.push({
    id: randomUUID(),
    studentId: s.id,
    classGroupId: classGroupList[3].id,
    from: s.enrolled,
  });
}

await db.insert(studentClassGroups).values(
  enrollments.map((e) => ({
    id: e.id,
    organizationId,
    studentId: e.studentId,
    classGroupId: e.classGroupId,
    activeFrom: e.from,
    activeUntil: null,
    createdAt: now,
  })),
);

// --- Class Sessions & Attendances (past 2 weeks) ---

const sessionInserts: {
  id: string;
  classGroupId: string;
  scheduledStartAt: Date;
  actualStartAt: Date;
  durationMinutes: number;
  endedAt: Date;
  status: string;
  kind: string;
}[] = [];

for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
  const d = daysAgo(dayOffset);
  const ds = dateStr(d);
  const wd = weekdayOf(ds);

  for (const sched of scheduleList) {
    if (sched.weekday !== wd) continue;
    const group = classGroupList.find((g) => g.id === sched.groupId);
    if (!group || group.status === "archived") continue;

    const start = scheduledStartAt(ds, sched.time);
    const endTime = new Date(start.getTime() + group.duration * 60000);

    sessionInserts.push({
      id: randomUUID(),
      classGroupId: group.id,
      scheduledStartAt: start,
      actualStartAt: start,
      durationMinutes: group.duration,
      endedAt: endTime,
      status: "ended",
      kind: "recurring",
    });
  }
}

if (sessionInserts.length > 0) {
  await db.insert(classSessions).values(
    sessionInserts.map((s) => ({
      id: s.id,
      organizationId,
      classGroupId: s.classGroupId,
      kind: s.kind,
      scheduledStartAt: s.scheduledStartAt,
      actualStartAt: s.actualStartAt,
      durationMinutes: s.durationMinutes,
      endedAt: s.endedAt,
      status: s.status,
      cancelledAt: null,
      cancelledByUserId: null,
      createdByUserId: userId,
      createdAt: s.scheduledStartAt,
      updatedAt: s.endedAt,
    })),
  );
}

// Generate attendances: ~70-90% attendance per session
const attendanceInserts: {
  id: string;
  classSessionId: string;
  studentId: string;
  createdAt: Date;
}[] = [];

for (const session of sessionInserts) {
  const group = classGroupList.find((g) => g.id === session.classGroupId);
  if (!group) continue;

  const enrolledStudents = enrollments
    .filter((e) => e.classGroupId === group.id)
    .map((e) => e.studentId);

  for (const sid of enrolledStudents) {
    // ~80% chance of attending
    const hash = simpleHash(`${session.id}-${sid}`);
    if (hash % 100 < 80) {
      attendanceInserts.push({
        id: randomUUID(),
        classSessionId: session.id,
        studentId: sid,
        createdAt: session.actualStartAt,
      });
    }
  }
}

if (attendanceInserts.length > 0) {
  for (let i = 0; i < attendanceInserts.length; i += 500) {
    const batch = attendanceInserts.slice(i, i + 500);
    await db.insert(attendances).values(
      batch.map((a) => ({
        id: a.id,
        organizationId,
        classSessionId: a.classSessionId,
        studentId: a.studentId,
        source: "manual",
        invalidatedAt: null,
        invalidatedByUserId: null,
        invalidationReason: null,
        createdByUserId: userId,
        createdAt: a.createdAt,
      })),
    );
  }
}

// --- Monthly Fees (past 3 months + current) ---

const feeInserts: {
  id: string;
  studentId: string;
  year: number;
  month: number;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: Date | null;
}[] = [];

for (const s of activeStudents) {
  for (let m = 3; m >= 0; m--) {
    const feeDate = monthsAgo(m);
    const year = feeDate.getFullYear();
    const month = feeDate.getMonth() + 1;
    const dueDay = Math.min(s.dueDay, 28);
    const dueDate = `${year}-${String(month).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
    const dueDateObj = new Date(`${dueDate}T23:59:59.000-03:00`);

    let status: string;
    let paidAt: Date | null = null;

    if (m === 0) {
      // Current month: mix of statuses
      const hash = simpleHash(`${s.id}-fee-${year}-${month}`);
      const mod = hash % 100;
      if (mod < 40) {
        status = "open";
      } else if (mod < 60) {
        status = "paid";
        paidAt = daysAgo(Math.floor(Math.random() * 10));
      } else if (mod < 75) {
        status = "under_review";
      } else {
        status = "open"; // overdue if past due date
      }
    } else if (m === 1) {
      // Last month: mostly paid, some overdue
      const hash = simpleHash(`${s.id}-fee-${year}-${month}`);
      if (hash % 100 < 75) {
        status = "paid";
        paidAt = new Date(dueDateObj.getTime() - 2 * 86400000);
      } else if (hash % 100 < 90) {
        status = "open"; // overdue
      } else {
        status = "under_review";
      }
    } else {
      // 2-3 months ago: mostly paid, one waived
      const hash = simpleHash(`${s.id}-fee-${year}-${month}`);
      if (hash % 100 < 90) {
        status = "paid";
        paidAt = new Date(dueDateObj.getTime() + 86400000);
      } else {
        status = "waived";
      }
    }

    feeInserts.push({
      id: randomUUID(),
      studentId: s.id,
      year,
      month,
      amount: s.amount,
      dueDate,
      status,
      paidAt,
    });
  }
}

if (feeInserts.length > 0) {
  await db.insert(monthlyFees).values(
    feeInserts.map((f) => ({
      id: f.id,
      organizationId,
      studentId: f.studentId,
      referenceYear: f.year,
      referenceMonth: f.month,
      amountInCents: f.amount,
      originalAmountInCents: f.amount,
      dueDate: f.dueDate,
      status: f.status,
      paidAt: f.paidAt,
      createdAt: now,
      updatedAt: now,
    })),
  );

  // Fee events for paid fees
  const paidFees = feeInserts.filter((f) => f.status === "paid");
  if (paidFees.length > 0) {
    await db.insert(monthlyFeeEvents).values(
      paidFees.map((f) => ({
        id: randomUUID(),
        monthlyFeeId: f.id,
        organizationId,
        type: "manual_payment",
        reason: null,
        metadata: null,
        createdByUserId: userId,
        createdAt: f.paidAt ?? now,
      })),
    );
  }
}

// --- Promotions (historical) ---

const promotionInserts = [
  // Pedro: white -> blue (1 year ago)
  {
    studentId: studentList[2].id,
    prevBelt: whiteBelt,
    prevDegree: 4,
    newBelt: blueBelt,
    newDegree: 0,
    date: dateStr(monthsAgo(12)),
    note: "Excelente evolução no jogo de guarda",
  },
  // Rafael: blue -> purple (2 years ago)
  {
    studentId: studentList[4].id,
    prevBelt: blueBelt,
    prevDegree: 4,
    newBelt: purpleBelt,
    newDegree: 0,
    date: dateStr(monthsAgo(24)),
    note: "Desempenho consistente em competições",
  },
  // Ana Beatriz: white -> blue (6 months ago)
  {
    studentId: studentList[5].id,
    prevBelt: whiteBelt,
    prevDegree: 4,
    newBelt: blueBelt,
    newDegree: 0,
    date: dateStr(monthsAgo(6)),
    note: null,
  },
  // Felipe: purple -> brown (1 year ago)
  {
    studentId: studentList[6].id,
    prevBelt: purpleBelt,
    prevDegree: 4,
    newBelt: brownBelt,
    newDegree: 0,
    date: dateStr(monthsAgo(12)),
    note: "Liderança e técnica exemplares",
  },
];

await db.insert(promotions).values(
  promotionInserts.map((p) => ({
    id: randomUUID(),
    organizationId,
    studentId: p.studentId,
    previousBeltId: p.prevBelt.id,
    previousDegree: p.prevDegree,
    newBeltId: p.newBelt.id,
    newDegree: p.newDegree,
    promotedAt: p.date,
    promotedByUserId: userId,
    note: p.note,
    createdAt: now,
  })),
);

// --- Student Notes ---

await db.insert(studentNotes).values([
  {
    id: randomUUID(),
    organizationId,
    studentId: studentList[0].id,
    content: "Muito dedicado, nunca falta aos treinos. Potencial para competir.",
    isVisible: true,
    archivedAt: null,
    createdByUserId: userId,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
  },
  {
    id: randomUUID(),
    organizationId,
    studentId: studentList[2].id,
    content: "Precisa trabalhar mais o jogo por cima. Conversar sobre competição estadual.",
    isVisible: true,
    archivedAt: null,
    createdByUserId: userId,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(15),
  },
  {
    id: randomUUID(),
    organizationId,
    studentId: studentList[4].id,
    content: "Lesão no joelho, liberado para treinar com restrições. Acompanhar evolução.",
    isVisible: true,
    archivedAt: null,
    createdByUserId: userId,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: randomUUID(),
    organizationId,
    studentId: studentList[7].id,
    content: "Aluna nova, está se adaptando bem. Colocar para treinar com a Mariana.",
    isVisible: true,
    archivedAt: null,
    createdByUserId: userId,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(45),
  },
  {
    id: randomUUID(),
    organizationId,
    studentId: studentList[12].id,
    content: "Ficou inativo por questões financeiras. Manter contato para possível retorno.",
    isVisible: false,
    archivedAt: null,
    createdByUserId: userId,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
  },
]);

// --- One cancellation for today (if there's a class today) ---

const todayWeekday = weekdayOf(today);
const todaySchedule = scheduleList.find((s) => s.weekday === todayWeekday);

if (todaySchedule && classGroupList.findIndex((g) => g.id === todaySchedule.groupId) < 5) {
  const secondScheduleToday = scheduleList.find(
    (s) => s.weekday === todayWeekday && s.id !== todaySchedule.id,
  );
  if (secondScheduleToday) {
    await db.insert(classCancellations).values({
      id: randomUUID(),
      organizationId,
      classGroupId: secondScheduleToday.groupId,
      classGroupScheduleId: secondScheduleToday.id,
      occurrenceDate: today,
      createdByUserId: userId,
      cancelledAt: now,
      revertedAt: null,
      revertedByUserId: null,
    });
  }
}

console.log(`\nSeed completo para "${academyName}"!`);
console.log(`Login: ${email} / ${password}`);
console.log(`\nDados criados:`);
console.log(
  `  - ${beltData.length + beltChildData.length} faixas (${beltData.length} adulto + ${beltChildData.length} infantil)`,
);
console.log(
  `  - ${studentList.length} alunos (${activeStudents.length} ativos, ${studentList.length - activeStudents.length} inativos)`,
);
console.log(
  `  - ${classGroupList.length} turmas (${classGroupList.filter((g) => g.status === "active").length} ativas)`,
);
console.log(`  - ${scheduleList.length} horários semanais`);
console.log(`  - ${sessionInserts.length} aulas (últimos 14 dias)`);
console.log(`  - ${attendanceInserts.length} presenças`);
console.log(`  - ${feeInserts.length} mensalidades`);
console.log(`  - ${promotionInserts.length} promoções`);

process.exit(0);

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}
