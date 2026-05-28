import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  attendances,
  belts,
  classGroups,
  classSessions,
  type Database,
  member,
  monthlyFees,
  organization,
  promotions,
  students,
  user,
} from "@tatamiq/database";
import { and, count, desc, eq, ilike, isNotNull, isNull, or } from "drizzle-orm";
import { DATABASE } from "../database/database.module";

export type PlatformDashboard = {
  totals: {
    academies: number;
    users: number;
    admins: number;
    bannedUsers: number;
  };
  recentAcademies: PlatformAcademySummary[];
};

export type PlatformAcademySummary = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  owner: PlatformAcademyOwner | null;
};

export type PlatformAcademyDetail = PlatformAcademySummary & {
  address: string | null;
  phone: string | null;
  instagram: string | null;
};

type PlatformAcademyOwner = {
  id: string;
  name: string;
  email: string;
};

export type PlatformAcademyOperationalOverview = {
  summary: {
    students: { total: number; active: number; inactive: number };
    classGroups: { total: number; active: number; archived: number };
    monthlyFees: { total: number; open: number; paid: number; underReview: number; waived: number };
    attendances: { total: number; valid: number; invalidated: number };
    promotions: { total: number };
  };
  students: Array<{
    id: string;
    name: string;
    status: string;
    email: string | null;
    belt: string | null;
    degree: number;
  }>;
  classGroups: Array<{
    id: string;
    name: string;
    status: string;
    defaultDurationMinutes: number;
  }>;
  monthlyFees: Array<{
    id: string;
    studentName: string;
    reference: string;
    amountInCents: number;
    dueDate: string;
    status: string;
  }>;
  attendances: Array<{
    id: string;
    studentName: string;
    classGroupName: string;
    source: string;
    status: "valid" | "invalidated";
    createdAt: string;
  }>;
  promotions: Array<{
    id: string;
    studentName: string;
    beltName: string;
    degree: number;
    promotedAt: string;
  }>;
};

@Injectable()
export class PlatformService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async dashboard(): Promise<PlatformDashboard> {
    const [[academyTotal], [userTotal], [adminTotal], [bannedTotal], recentAcademies] =
      await Promise.all([
        this.db.select({ total: count() }).from(organization),
        this.db.select({ total: count() }).from(user),
        this.db.select({ total: count() }).from(user).where(eq(user.role, "admin")),
        this.db.select({ total: count() }).from(user).where(eq(user.banned, true)),
        this.listAcademies({ page: 0, pageSize: 5 }),
      ]);

    return {
      totals: {
        academies: academyTotal?.total ?? 0,
        users: userTotal?.total ?? 0,
        admins: adminTotal?.total ?? 0,
        bannedUsers: bannedTotal?.total ?? 0,
      },
      recentAcademies: recentAcademies.items,
    };
  }

  async listAcademies(options: { query?: string; page?: number; pageSize?: number } = {}) {
    const page = Math.max(0, options.page ?? 0);
    const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));
    const query = options.query?.trim();
    const where = query
      ? or(
          ilike(organization.name, `%${query}%`),
          ilike(organization.slug, `%${query}%`),
          ilike(user.email, `%${query}%`),
        )
      : undefined;

    const baseRows = this.db
      .select({ organization, owner: user })
      .from(organization)
      .leftJoin(
        member,
        // Only the technical owner represents the Dono/Instrutor Solo in V1.
        and(eq(member.organizationId, organization.id), eq(member.role, "owner")),
      )
      .leftJoin(user, eq(user.id, member.userId))
      .where(where)
      .orderBy(desc(organization.createdAt))
      .limit(pageSize)
      .offset(page * pageSize);

    const totalRows = this.db
      .select({ total: count() })
      .from(organization)
      .leftJoin(member, and(eq(member.organizationId, organization.id), eq(member.role, "owner")))
      .leftJoin(user, eq(user.id, member.userId))
      .where(where);

    const [rows, [{ total }]] = await Promise.all([baseRows, totalRows]);

    return {
      items: rows.map((row) => toAcademySummary(row.organization, row.owner)),
      pagination: {
        page,
        pageSize,
        total: total ?? 0,
        totalPages: Math.ceil((total ?? 0) / pageSize),
      },
    };
  }

  async getAcademy(id: string): Promise<PlatformAcademyDetail> {
    const [row] = await this.db
      .select({ organization, owner: user })
      .from(organization)
      .leftJoin(member, and(eq(member.organizationId, organization.id), eq(member.role, "owner")))
      .leftJoin(user, eq(user.id, member.userId))
      .where(eq(organization.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException("Academia não encontrada.");
    }

    return {
      ...toAcademySummary(row.organization, row.owner),
      address: row.organization.address,
      phone: row.organization.phone,
      instagram: row.organization.instagram,
    };
  }

  async getAcademyOperationalOverview(id: string): Promise<PlatformAcademyOperationalOverview> {
    await this.getAcademy(id);

    const [
      studentRows,
      classGroupRows,
      monthlyFeeRows,
      attendanceRows,
      promotionRows,
      [studentTotal],
      [activeStudentTotal],
      [inactiveStudentTotal],
      [classGroupTotal],
      [activeClassGroupTotal],
      [archivedClassGroupTotal],
      [monthlyFeeTotal],
      [openFeeTotal],
      [paidFeeTotal],
      [underReviewFeeTotal],
      [waivedFeeTotal],
      [attendanceTotal],
      [validAttendanceTotal],
      [invalidatedAttendanceTotal],
      [promotionTotal],
    ] = await Promise.all([
      this.db
        .select({ student: students, belt: belts })
        .from(students)
        .leftJoin(belts, eq(students.currentBeltId, belts.id))
        .where(eq(students.organizationId, id))
        .orderBy(students.name)
        .limit(10),
      this.db
        .select()
        .from(classGroups)
        .where(eq(classGroups.organizationId, id))
        .orderBy(classGroups.name)
        .limit(10),
      this.db
        .select({ fee: monthlyFees, student: students })
        .from(monthlyFees)
        .leftJoin(students, eq(monthlyFees.studentId, students.id))
        .where(eq(monthlyFees.organizationId, id))
        .orderBy(desc(monthlyFees.dueDate))
        .limit(10),
      this.db
        .select({ attendance: attendances, student: students, classGroup: classGroups })
        .from(attendances)
        .leftJoin(students, eq(attendances.studentId, students.id))
        .leftJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
        .leftJoin(classGroups, eq(classSessions.classGroupId, classGroups.id))
        .where(eq(attendances.organizationId, id))
        .orderBy(desc(attendances.createdAt))
        .limit(10),
      this.db
        .select({ promotion: promotions, student: students, belt: belts })
        .from(promotions)
        .leftJoin(students, eq(promotions.studentId, students.id))
        .leftJoin(belts, eq(promotions.newBeltId, belts.id))
        .where(eq(promotions.organizationId, id))
        .orderBy(desc(promotions.promotedAt), desc(promotions.createdAt))
        .limit(10),
      this.countStudents(id),
      this.countStudents(id, "active"),
      this.countStudents(id, "inactive"),
      this.countClassGroups(id),
      this.countClassGroups(id, "active"),
      this.countClassGroups(id, "archived"),
      this.countMonthlyFees(id),
      this.countMonthlyFees(id, "open"),
      this.countMonthlyFees(id, "paid"),
      this.countMonthlyFees(id, "under_review"),
      this.countMonthlyFees(id, "waived"),
      this.countAttendances(id),
      this.countAttendances(id, "valid"),
      this.countAttendances(id, "invalidated"),
      this.countPromotions(id),
    ]);

    return {
      summary: {
        students: {
          total: studentTotal?.total ?? 0,
          active: activeStudentTotal?.total ?? 0,
          inactive: inactiveStudentTotal?.total ?? 0,
        },
        classGroups: {
          total: classGroupTotal?.total ?? 0,
          active: activeClassGroupTotal?.total ?? 0,
          archived: archivedClassGroupTotal?.total ?? 0,
        },
        monthlyFees: {
          total: monthlyFeeTotal?.total ?? 0,
          open: openFeeTotal?.total ?? 0,
          paid: paidFeeTotal?.total ?? 0,
          underReview: underReviewFeeTotal?.total ?? 0,
          waived: waivedFeeTotal?.total ?? 0,
        },
        attendances: {
          total: attendanceTotal?.total ?? 0,
          valid: validAttendanceTotal?.total ?? 0,
          invalidated: invalidatedAttendanceTotal?.total ?? 0,
        },
        promotions: { total: promotionTotal?.total ?? 0 },
      },
      students: studentRows.map((row) => ({
        id: row.student.id,
        name: row.student.name,
        status: row.student.status,
        email: row.student.email,
        belt: row.belt?.name ?? null,
        degree: row.student.currentDegree,
      })),
      classGroups: classGroupRows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        defaultDurationMinutes: row.defaultDurationMinutes,
      })),
      monthlyFees: monthlyFeeRows.map((row) => ({
        id: row.fee.id,
        studentName: row.student?.name ?? "Aluno não encontrado",
        reference: `${String(row.fee.referenceMonth).padStart(2, "0")}/${row.fee.referenceYear}`,
        amountInCents: row.fee.amountInCents,
        dueDate: row.fee.dueDate,
        status: row.fee.status,
      })),
      attendances: attendanceRows.map((row) => ({
        id: row.attendance.id,
        studentName: row.student?.name ?? "Aluno não encontrado",
        classGroupName: row.classGroup?.name ?? "Turma não encontrada",
        source: row.attendance.source,
        status: row.attendance.invalidatedAt ? "invalidated" : "valid",
        createdAt: row.attendance.createdAt.toISOString(),
      })),
      promotions: promotionRows.map((row) => ({
        id: row.promotion.id,
        studentName: row.student?.name ?? "Aluno não encontrado",
        beltName: row.belt?.name ?? "Faixa não encontrada",
        degree: row.promotion.newDegree,
        promotedAt: row.promotion.promotedAt,
      })),
    };
  }

  private countStudents(organizationId: string, status?: string) {
    return this.db
      .select({ total: count() })
      .from(students)
      .where(
        status
          ? and(eq(students.organizationId, organizationId), eq(students.status, status))
          : eq(students.organizationId, organizationId),
      );
  }

  private countClassGroups(organizationId: string, status?: string) {
    return this.db
      .select({ total: count() })
      .from(classGroups)
      .where(
        status
          ? and(eq(classGroups.organizationId, organizationId), eq(classGroups.status, status))
          : eq(classGroups.organizationId, organizationId),
      );
  }

  private countMonthlyFees(organizationId: string, status?: string) {
    return this.db
      .select({ total: count() })
      .from(monthlyFees)
      .where(
        status
          ? and(eq(monthlyFees.organizationId, organizationId), eq(monthlyFees.status, status))
          : eq(monthlyFees.organizationId, organizationId),
      );
  }

  private countAttendances(organizationId: string, status?: "valid" | "invalidated") {
    const statusCondition =
      status === "valid"
        ? isNull(attendances.invalidatedAt)
        : status === "invalidated"
          ? isNotNull(attendances.invalidatedAt)
          : undefined;

    return this.db
      .select({ total: count() })
      .from(attendances)
      .where(
        statusCondition
          ? and(eq(attendances.organizationId, organizationId), statusCondition)
          : eq(attendances.organizationId, organizationId),
      );
  }

  private countPromotions(organizationId: string) {
    return this.db
      .select({ total: count() })
      .from(promotions)
      .where(eq(promotions.organizationId, organizationId));
  }
}

type OrganizationRow = typeof organization.$inferSelect;
type UserRow = typeof user.$inferSelect;

function toAcademySummary(org: OrganizationRow, owner: UserRow | null): PlatformAcademySummary {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo,
    createdAt: org.createdAt.toISOString(),
    owner: owner
      ? {
          id: owner.id,
          name: owner.name,
          email: owner.email,
        }
      : null,
  };
}
