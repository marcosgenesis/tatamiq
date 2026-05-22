import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateStudentInput, Student, UpdateStudentInput } from "@tatamiq/contracts";
import { type Database, studentGuardians, students } from "@tatamiq/database";
import { and, eq, inArray } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { validateStudentInput } from "./student-rules";

type StudentRow = typeof students.$inferSelect;
type GuardianRow = typeof studentGuardians.$inferSelect;

type StudentStatusFilter = "active" | "inactive" | "all";

@Injectable()
export class StudentsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(organizationId: string, status: StudentStatusFilter = "active") {
    const conditions = [eq(students.organizationId, organizationId)];
    if (status !== "all") {
      conditions.push(eq(students.status, status));
    }

    const rows = await this.db
      .select()
      .from(students)
      .where(and(...conditions))
      .orderBy(students.name);

    const guardians = await this.guardiansFor(rows.map((row) => row.id));
    const allRows = await this.db
      .select({ status: students.status })
      .from(students)
      .where(eq(students.organizationId, organizationId));

    const active = allRows.filter((row) => row.status === "active").length;
    const inactive = allRows.filter((row) => row.status === "inactive").length;

    return {
      students: rows.map((row) => toStudentDto(row, guardians.get(row.id) ?? null)),
      summary: {
        active,
        inactive,
        total: active + inactive,
      },
    };
  }

  async create(organizationId: string, input: CreateStudentInput): Promise<Student> {
    validateStudentInput(input);

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
      currentBelt: input.currentBelt,
      currentDegree: input.currentDegree,
      graduationPath: input.graduationPath,
      createdAt: now,
      updatedAt: now,
    });

    if (input.guardian) {
      await this.insertGuardian(studentId, input.guardian);
    }

    return this.get(organizationId, studentId);
  }

  async get(organizationId: string, id: string): Promise<Student> {
    const row = await this.findStudent(organizationId, id);
    const guardian = await this.findGuardian(id);
    return toStudentDto(row, guardian);
  }

  async update(organizationId: string, id: string, input: UpdateStudentInput): Promise<Student> {
    await this.findStudent(organizationId, id);
    validateStudentInput(input);

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
        currentBelt: input.currentBelt,
        currentDegree: input.currentDegree,
        graduationPath: input.graduationPath,
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

  private async findStudent(organizationId: string, id: string): Promise<StudentRow> {
    const [row] = await this.db
      .select()
      .from(students)
      .where(and(eq(students.id, id), eq(students.organizationId, organizationId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException("Aluno não encontrado.");
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

function toStudentDto(row: StudentRow, guardian: GuardianRow | null): Student {
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
    currentBelt: parseBelt(row.currentBelt),
    currentDegree: row.currentDegree,
    graduationPath: parseGraduationPath(row.graduationPath),
    guardian: guardian
      ? {
          id: guardian.id,
          name: guardian.name,
          phone: guardian.phone,
          email: guardian.email,
          relationship: guardian.relationship,
        }
      : null,
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
  throw new BadRequestException("Status de aluno inválido.");
}

function parseGraduationPath(value: string): "adult" | "child" {
  if (value === "adult" || value === "child") return value;
  throw new BadRequestException("Trilha de graduação inválida.");
}

function parseBelt(value: string): Student["currentBelt"] {
  const validBelts = [
    "white",
    "gray",
    "yellow",
    "orange",
    "green",
    "blue",
    "purple",
    "brown",
    "black",
  ];
  if (validBelts.includes(value)) return value as Student["currentBelt"];
  throw new BadRequestException("Faixa inválida.");
}
