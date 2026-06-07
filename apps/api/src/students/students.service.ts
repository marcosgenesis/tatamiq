import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateStudentInput, Student, UpdateStudentInput } from "@tatamiq/contracts";
import { belts, type Database, studentGuardians, students } from "@tatamiq/database";
import { and, count, eq, inArray, ne, sql } from "drizzle-orm";
import { BeltsService, toBeltDto } from "../belts/belts.service";
import { DATABASE } from "../database/database.module";
import { StudentAccessService } from "../student-access/student-access.service";
import { validateStudentInput } from "./student-rules";

type StudentRow = typeof students.$inferSelect;
type GuardianRow = typeof studentGuardians.$inferSelect;
type BeltRow = typeof belts.$inferSelect;

type StudentStatusFilter = "active" | "inactive" | "all";

@Injectable()
export class StudentsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(StudentAccessService) private readonly studentAccessService: StudentAccessService,
    @Inject(BeltsService) private readonly beltsService: BeltsService,
  ) {}

  async list(
    organizationId: string,
    opts: { status?: StudentStatusFilter; page?: number; pageSize?: number } = {},
  ) {
    const { status = "active", page = 0, pageSize = 10 } = opts;

    const conditions = [eq(students.organizationId, organizationId)];
    if (status !== "all") {
      conditions.push(eq(students.status, status));
    }

    const [{ total: filteredTotal }] = await this.db
      .select({ total: count() })
      .from(students)
      .where(and(...conditions));

    const rows = await this.db
      .select({
        student: students,
        belt: belts,
      })
      .from(students)
      .leftJoin(belts, eq(students.currentBeltId, belts.id))
      .where(and(...conditions))
      .orderBy(students.name)
      .limit(pageSize)
      .offset(page * pageSize);

    const studentIds = rows.map((row) => row.student.id);
    const guardians = await this.guardiansFor(studentIds);
    const accessStates = await this.studentAccessService.accessStatesForStudents(studentIds);

    const allRows = await this.db
      .select({ status: students.status })
      .from(students)
      .where(eq(students.organizationId, organizationId));

    const active = allRows.filter((row) => row.status === "active").length;
    const inactive = allRows.filter((row) => row.status === "inactive").length;

    return {
      students: rows.map((row) =>
        toStudentDto(
          row.student,
          guardians.get(row.student.id) ?? null,
          accessStates.get(row.student.id),
          row.belt,
        ),
      ),
      summary: {
        active,
        inactive,
        total: active + inactive,
      },
      pagination: {
        page,
        pageSize,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / pageSize),
      },
    };
  }

  async create(organizationId: string, input: CreateStudentInput): Promise<Student> {
    validateStudentInput(input);
    await this.assertUniqueEmail(organizationId, input.email);

    const belt = await this.beltsService.findById(organizationId, input.currentBeltId);
    if (!belt) {
      throw new BadRequestException("Faixa nao encontrada.");
    }

    const studentId = crypto.randomUUID();
    const now = new Date();

    await this.db.insert(students).values({
      id: studentId,
      organizationId,
      name: input.name.trim(),
      birthDate: input.birthDate,
      enrollmentDate: input.enrollmentDate,
      status: "active",
      inactiveAt: null,
      phone: emptyToNull(input.phone),
      email: emptyToNull(input.email),
      monthlyAmountInCents: input.monthlyAmountInCents ?? null,
      monthlyDueDay: input.monthlyDueDay ?? null,
      currentBeltId: input.currentBeltId,
      currentDegree: input.currentDegree,
      createdAt: now,
      updatedAt: now,
    });

    if (input.guardian) {
      await this.insertGuardian(studentId, input.guardian);
    }

    return this.get(organizationId, studentId);
  }

  async get(organizationId: string, id: string): Promise<Student> {
    const row = await this.findStudentWithBelt(organizationId, id);
    const guardian = await this.findGuardian(id);
    const accessStates = await this.studentAccessService.accessStatesForStudents([id]);
    return toStudentDto(row.student, guardian, accessStates.get(id), row.belt);
  }

  async update(organizationId: string, id: string, input: UpdateStudentInput): Promise<Student> {
    await this.findStudent(organizationId, id);
    validateStudentInput(input);
    await this.assertUniqueEmail(organizationId, input.email, id);

    const belt = await this.beltsService.findById(organizationId, input.currentBeltId);
    if (!belt) {
      throw new BadRequestException("Faixa nao encontrada.");
    }

    const status = input.status;
    const now = new Date();

    await this.db
      .update(students)
      .set({
        name: input.name.trim(),
        birthDate: input.birthDate,
        enrollmentDate: input.enrollmentDate,
        status,
        inactiveAt: status === "inactive" ? now : status === "active" ? null : undefined,
        phone: emptyToNull(input.phone),
        email: emptyToNull(input.email),
        monthlyAmountInCents: input.monthlyAmountInCents ?? null,
        monthlyDueDay: input.monthlyDueDay ?? null,
        currentBeltId: input.currentBeltId,
        currentDegree: input.currentDegree,
        updatedAt: now,
      })
      .where(and(eq(students.id, id), eq(students.organizationId, organizationId)));

    await this.replaceGuardian(id, input.guardian ?? null);

    return this.get(organizationId, id);
  }

  async inactivate(organizationId: string, id: string): Promise<Student> {
    await this.findStudent(organizationId, id);
    await this.db
      .update(students)
      .set({ status: "inactive", inactiveAt: new Date(), updatedAt: new Date() })
      .where(and(eq(students.id, id), eq(students.organizationId, organizationId)));

    return this.get(organizationId, id);
  }

  async reactivate(organizationId: string, id: string): Promise<Student> {
    await this.findStudent(organizationId, id);
    await this.db
      .update(students)
      .set({ status: "active", inactiveAt: null, updatedAt: new Date() })
      .where(and(eq(students.id, id), eq(students.organizationId, organizationId)));

    return this.get(organizationId, id);
  }

  private async assertUniqueEmail(
    organizationId: string,
    email: string | null | undefined,
    ignoreStudentId?: string,
  ) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) return;

    const conditions = [
      eq(students.organizationId, organizationId),
      sql`lower(${students.email}) = ${normalizedEmail}`,
    ];
    if (ignoreStudentId) conditions.push(ne(students.id, ignoreStudentId));

    const [existing] = await this.db
      .select({ id: students.id })
      .from(students)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      throw new BadRequestException("Já existe um aluno com este email.");
    }
  }

  private async findStudent(organizationId: string, id: string): Promise<StudentRow> {
    const [row] = await this.db
      .select()
      .from(students)
      .where(and(eq(students.id, id), eq(students.organizationId, organizationId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException("Aluno nao encontrado.");
    }

    return row;
  }

  private async findStudentWithBelt(
    organizationId: string,
    id: string,
  ): Promise<{ student: StudentRow; belt: BeltRow | null }> {
    const [row] = await this.db
      .select({ student: students, belt: belts })
      .from(students)
      .leftJoin(belts, eq(students.currentBeltId, belts.id))
      .where(and(eq(students.id, id), eq(students.organizationId, organizationId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException("Aluno nao encontrado.");
    }

    return row;
  }

  private async guardiansFor(studentIds: string[]): Promise<Map<string, GuardianRow>> {
    if (studentIds.length === 0) return new Map();

    const rows = await this.db
      .select()
      .from(studentGuardians)
      .where(inArray(studentGuardians.studentId, studentIds));

    return new Map(rows.map((row) => [row.studentId, row]));
  }

  private async findGuardian(studentId: string): Promise<GuardianRow | null> {
    const [row] = await this.db
      .select()
      .from(studentGuardians)
      .where(eq(studentGuardians.studentId, studentId))
      .limit(1);

    return row ?? null;
  }

  private async replaceGuardian(
    studentId: string,
    guardian: CreateStudentInput["guardian"],
  ): Promise<void> {
    await this.db.delete(studentGuardians).where(eq(studentGuardians.studentId, studentId));

    if (guardian) {
      await this.insertGuardian(studentId, guardian);
    }
  }

  private async insertGuardian(
    studentId: string,
    guardian: NonNullable<CreateStudentInput["guardian"]>,
  ) {
    const now = new Date();
    await this.db.insert(studentGuardians).values({
      id: crypto.randomUUID(),
      studentId,
      name: guardian.name.trim(),
      phone: guardian.phone.trim(),
      email: emptyToNull(guardian.email),
      relationship: emptyToNull(guardian.relationship),
      createdAt: now,
      updatedAt: now,
    });
  }
}

function toStudentDto(
  row: StudentRow,
  guardian: GuardianRow | null,
  accessState: Student["accessState"] = {
    status: "none",
    inviteId: null,
    expiresAt: null,
    accessId: null,
  },
  beltRow: BeltRow | null = null,
): Student {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birthDate,
    enrollmentDate: row.enrollmentDate,
    status: parseStatus(row.status),
    inactiveAt: row.inactiveAt?.toISOString() ?? null,
    phone: row.phone,
    email: row.email,
    monthlyAmountInCents: row.monthlyAmountInCents,
    monthlyDueDay: row.monthlyDueDay,
    currentBeltId: row.currentBeltId,
    currentDegree: row.currentDegree,
    belt: beltRow ? toBeltDto(beltRow) : null,
    guardian: guardian
      ? {
          id: guardian.id,
          name: guardian.name,
          phone: guardian.phone,
          email: guardian.email,
          relationship: guardian.relationship,
        }
      : null,
    accessState,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseStatus(value: string): "active" | "inactive" {
  if (value === "active" || value === "inactive") return value;
  throw new BadRequestException("Status de aluno invalido.");
}
